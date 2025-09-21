import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
} from 'react-native';

// --- Type Definitions ---
interface LogItem {
  _id: string;
  doNo: string;
  status: 'success' | 'pending' | 'error';
  response?: {
    d?: {
      message?: string;
    };
  };
  payload?: {
    getloadingsequence?: {
      results: {
        matnr: string;
        charg: string;
        lfimg: string;
        meins: string;
        uecha: string;
      }[];
    };
  };
  sapResponse?: {
    status: 'success' | 'error';
    message: string;
    rescode?: string;
  };
}

export default function Picking() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [vepToken, setVepToken] = useState('2025-M251-0000097390');
  const [selectedLogs, setSelectedLogs] = useState(new Set<string>());
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    // This effect is used for side effects and debugging.
  }, [logs, isSending]);

  const fetchLogs = async () => {
    setLoading(true);
    setLogs([]);
    setSelectedLogs(new Set());
    try {
      // **IMPORTANT**: Replace with your actual server URL
      const response = await fetch(`http://your-server-address:4000/records/toGeneratedLogs?vepToken=${vepToken}`);
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleLogSelection = (logId: string) => {
    setSelectedLogs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(logId)) {
        newSet.delete(logId);
      } else {
        newSet.add(logId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedLogs.size === logs.length) {
      setSelectedLogs(new Set());
    } else {
      const allIds = new Set(logs.map(log => log._id));
      setSelectedLogs(allIds);
    }
  };

  const handleSendPickingRequests = async () => {
    if (selectedLogs.size === 0) {
      return;
    }

    setIsSending(true);

    const requests = Array.from(selectedLogs).map(async logId => {
      const log = logs.find(l => l._id === logId);
      if (!log) return null;

      const payload = {
        vepToken,
        selectedItems: log.payload?.getloadingsequence?.results || [],
      };

      try {
        const response = await fetch('http://your-server-address/api/sap-picking-request', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const result = await response.json();
        const sapMessage = result?.message?.trim() || 'Operation successful.';
        const sapRescode = result?.rescode || '';

        return {
          logId,
          sapResponse: {
            message: response.ok ? sapMessage : `Error: ${sapMessage}`,
            rescode: sapRescode,
            status: response.ok ? 'success' : 'error',
          },
        };
      } catch (error) {
        console.error(`Failed to send request for log ${logId}:`, error);
        return {
          logId,
          sapResponse: {
            message: 'Network Error: Failed to connect to server.',
            rescode: '',
            status: 'error',
          },
        };
      }
    });

    const results = await Promise.allSettled(requests);

    setLogs(prevLogs =>
      prevLogs.map(log => {
        const result = results.find(res => (res as PromiseFulfilledResult<any>)?.value?.logId === log._id);
        if (result && result.status === 'fulfilled' && result.value) {
          return {
            ...log,
            sapResponse: result.value.sapResponse,
          };
        }
        return log;
      })
    );

    setSelectedLogs(new Set());
    setIsSending(false);
  };

  const renderLogItem = ({ item: log }: { item: LogItem }) => {
    const isSelected = selectedLogs.has(log._id);
    const cardBorderColor = log.sapResponse?.status === 'success' ? '#22c55e'
      : log.sapResponse?.status === 'error' ? '#ef4444'
        : 'transparent';

    return (
      <TouchableOpacity
        key={log._id}
        style={[
          styles.card,
          isSelected && styles.selectedCard,
          { borderColor: cardBorderColor, borderWidth: 2 },
        ]}
        onPress={() => toggleLogSelection(log._id)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={styles.doNoText}>DO No: {log.doNo}</Text>
          <Text
            style={[
              styles.statusBadge,
              log.status === 'success' ? styles.statusSuccess : styles.statusPending,
            ]}
          >
            {log.status === 'success' ? 'Completed' : 'Pending'}
          </Text>
        </View>
        <Text style={styles.messageText}>{log.response?.d?.message}</Text>

        <View style={styles.tableContainer}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>Material</Text>
            <Text style={styles.tableHeaderCell}>Batch</Text>
            <Text style={styles.tableHeaderCell}>Qty</Text>
            <Text style={styles.tableHeaderCell}>Unit</Text>
            <Text style={styles.tableHeaderCell}>Item</Text>
          </View>
          {(log.payload?.getloadingsequence?.results || []).map((item, index) => (
            <View
              key={index}
              style={[styles.tableRow, index === log.payload.getloadingsequence.results.length - 1 && styles.lastRow]}
            >
              <Text style={styles.tableCell}>{item.matnr}</Text>
              <Text style={styles.tableCell}>{item.charg}</Text>
              <Text style={styles.tableCell}>{item.lfimg}</Text>
              <Text style={styles.tableCell}>{item.meins}</Text>
              <Text style={styles.tableCell}>{item.uecha}</Text>
            </View>
          ))}
        </View>

        {log.sapResponse && (
          <View style={styles.sapResponseContainer}>
            <Text
              style={[
                styles.sapResponseText,
                log.sapResponse.status === 'success' ? styles.sapResponseSuccess : styles.sapResponseError,
              ]}
            >
              Status: {log.sapResponse.message}
            </Text>
            {log.sapResponse.rescode && (
              <Text
                style={[
                  styles.sapResponseText,
                  log.sapResponse.status === 'success' ? styles.sapResponseSuccess : styles.sapResponseError,
                ]}
              >
                Code: {log.sapResponse.rescode}
              </Text>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderContent = () => {
    if (loading || isSending) {
      return (
        <View style={styles.centeredContainer}>
          <ActivityIndicator size="large" color="#3b82f6" />
          <Text style={styles.loadingText}>
            {loading ? 'Loading logs...' : 'Sending requests...'}
          </Text>
        </View>
      );
    }

    if (logs.length > 0) {
      return (
        <>
          <View style={styles.logActionsContainer}>
            <Text style={styles.selectedText}>{selectedLogs.size} selected</Text>
            <TouchableOpacity
              style={styles.selectAllButton}
              onPress={handleSelectAll}
            >
              <Text style={styles.selectAllButtonText}>
                {selectedLogs.size === logs.length ? 'Deselect All' : 'Select All'}
              </Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={logs}
            keyExtractor={item => item._id}
            renderItem={renderLogItem}
            contentContainerStyle={styles.flatListContent}
          />

          <TouchableOpacity
            style={[
              styles.sendButton,
              (selectedLogs.size === 0 || isSending) && styles.sendButtonDisabled,
            ]}
            onPress={handleSendPickingRequests}
            disabled={selectedLogs.size === 0 || isSending}
          >
            <Text style={styles.sendButtonText}>
              {isSending ? 'Sending...' : `Send Picking Request (${selectedLogs.size})`}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    if (!loading && vepToken) {
      return (
        <View style={styles.centeredContainer}>
          <Text style={styles.noLogsText}>No logs found for this VEP Token.</Text>
        </View>
      );
    }

    return null;
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Enter VEP Token"
          value={vepToken}
          onChangeText={setVepToken}
          editable={!loading && !isSending}
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={fetchLogs}
          disabled={loading || isSending}
        >
          <Text style={styles.searchButtonText}>
            {loading ? 'Searching...' : 'Search Logs'}
          </Text>
        </TouchableOpacity>
      </View>
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6',
    padding: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
    backgroundColor: '#fff',
  },
  searchButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  searchButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  centeredContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#4b5563',
  },
  logActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  selectedText: {
    fontSize: 14,
    color: '#4b5563',
    fontWeight: 'bold',
  },
  selectAllButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#e5e7eb',
  },
  selectAllButtonText: {
    color: '#4b5563',
    fontWeight: 'bold',
    fontSize: 12,
  },
  flatListContent: {
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  selectedCard: {
    borderColor: '#3b82f6',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  doNoText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 99,
    fontSize: 10,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSuccess: {
    backgroundColor: '#22c55e',
  },
  statusPending: {
    backgroundColor: '#facc15',
  },
  messageText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  tableContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    flex: 1,
    padding: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 10,
    color: '#4b5563',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  lastRow: {
    borderBottomWidth: 0,
  },
  tableCell: {
    flex: 1,
    padding: 8,
    textAlign: 'center',
    fontSize: 12,
    color: '#4b5563',
  },
  sapResponseContainer: {
    paddingTop: 8,
  },
  sapResponseText: {
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: 12,
  },
  sapResponseSuccess: {
    color: '#166534',
  },
  sapResponseError: {
    color: '#991b1b',
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  noLogsText: {
    fontSize: 16,
    color: '#6b7280',
  },
});