/*

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
interface ODBItem {
  id: string;
  sNo: number;
  vepToken: string;
  doNo: string;
  wmsPicking: string;
  pickingStatus: string;
  pgiStatus: string;
  posnr: string;
  material: string;
  materialDes: string;
  qty: number;
  batch: string;
  uom: string;
  bin: string;
  storageType: string;
  destSloc: string;
  warehouse: string;
  storage: string;
  plant: string;
  dock: string;
  net: number;
  gross: number;
  truck: string;
  toNo: string;
  sequenceNo: string;
  channel: string;
  uecha: string;
  docCata?: string;
  actualBatch: string;
  actualQuantity: number;
  isNew: boolean;
  status: "pending" | "loading" | "transferred" | "picked" | "completed" | "error";
  errorMessage?: string;
}

interface ODBGroup {
  doNo: string;
  items: ODBItem[];
  status: "pending" | "loading" | "transferred" | "picked" | "completed" | "error";
  isEditing: boolean;
  validation: {
    status: "success" | "warning" | "error" | null;
    message: string | null;
  };
  pickingPayload?: any;
  sapResponse?: any;
}

interface SapPickingProps {
  odbGroups: ODBGroup[];
  onComplete: () => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    console.log('Credentials set for user:', username);
  },

  getStoredToken: (): string | null => {
    return null;
  },

  clearCredentials: (): void => {
    console.log('Credentials cleared');
  }
};

// Simple btoa implementation for React Native
const btoa = (input: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = input.charCodeAt(i++);
    const c = input.charCodeAt(i++);
    
    const index1 = a >> 2;
    const index2 = ((a & 3) << 4) | (b >> 4);
    const index3 = isNaN(b) ? 64 : ((b & 15) << 2) | (c >> 6);
    const index4 = isNaN(c) ? 64 : c & 63;
    
    output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + chars.charAt(index4);
  }
  
  return output;
};

// SAP Picking Status API call
const sendSapPickingStatus = async (pickingPayload: any): Promise<any> => {
  const username = "VERTIF_01";
  const password = "EmamiWM@Qas24";
  const basicAuth = BasicAuth.getAuthHeader(username, password);
  
  const sapUrl = "https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet";

  try {
    // Step 1: Get CSRF token and cookies from SAP
    const csrfResponse = await fetch(sapUrl, {
      method: "GET",
      headers: {
        "X-CSRF-Token": "Fetch",
        "Authorization": basicAuth,
        "Accept": "application/json",
      },
    });

    if (!csrfResponse.ok) {
      throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
    }

    const csrfToken = csrfResponse.headers.get("X-CSRF-Token");
    if (!csrfToken) {
      throw new Error("Failed to obtain CSRF token from SAP");
    }

    // Step 2: Send the picking request with the obtained token
    const pickingResponse = await fetch(sapUrl, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
        "Authorization": basicAuth,
        "Accept": "application/json",
      },
      body: JSON.stringify(pickingPayload),
    });

    if (!pickingResponse.ok) {
      throw new Error(`SAP picking failed: ${pickingResponse.status}`);
    }

    const result = await pickingResponse.json();
    return result;
  } catch (error) {
    console.error("SAP API Error:", error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EyeIcon = () => <Text style={styles.icon}>👁️</Text>;
const EyeOffIcon = () => <Text style={styles.icon}>🚫</Text>;

const SapPicking: React.FC<SapPickingProps> = ({ odbGroups, onComplete }) => {
  const [pickingState, setPickingState] = useState(odbGroups);
  const [sapResponses, setSapResponses] = useState<Record<string, any>>({});
  const [showRawResponse, setShowRawResponse] = useState<Record<string, boolean>>({});

  const toggleRawResponse = (doNo: string) => {
    setShowRawResponse((prev) => ({ ...prev, [doNo]: !prev[doNo] }));
  };

  const allGroupsAreFinalized = useMemo(() => {
    return (
      pickingState.length > 0 &&
      pickingState.every(
        (group) => group.status === "picked" || group.status === "completed"
      )
    );
  }, [pickingState]);

  const initiatePicking = async (doNo: string, pickingPayload: any): Promise<void> => {
    setPickingState((prev) =>
      prev.map((g) => (g.doNo === doNo ? { ...g, status: "loading" } : g))
    );

    try {
      const data = await sendSapPickingStatus(pickingPayload);

      setSapResponses((prev) => ({ ...prev, [doNo]: data }));

      let newStatus: ODBGroup["status"] = "error";
      const rescode = (data?.rescode ?? data?.d?.rescode ?? "")
        .toString()
        .trim()
        .toLowerCase();
      const messageRaw = (
        data?.message ??
        data?.d?.message ??
        ""
      ).toString();
      const message = messageRaw.trim().toLowerCase();

      if (rescode === "s" || rescode === "c") {
        newStatus = "picked";
      }

      const successPhrases = [
        "DO already has an existing TO",
        "already has an existing to",
        "do already has",
        "success",
        "picked",
        "already exists",
      ];

      if (newStatus !== "picked") {
        for (const phrase of successPhrases) {
          if (phrase && message.includes(phrase.toLowerCase())) {
            newStatus = "picked";
            break;
          }
        }
      }

      setPickingState((prev) =>
        prev.map((g) =>
          g.doNo === doNo
            ? {
                ...g,
                status: newStatus,
                validation: {
                  status: newStatus === "picked" ? "success" : "error",
                  message: messageRaw || "Picking completed",
                },
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Picking confirmation failed.";
      console.error("initiatePicking error", doNo, err);
      setPickingState((prev) =>
        prev.map((g) =>
          g.doNo === doNo
            ? {
                ...g,
                status: "error",
                validation: { status: "error", message: errorMessage },
              }
            : g
        )
      );
    }
  };

  const handlePicking = useCallback(
    async (doNo: string): Promise<void> => {
      const group = pickingState.find((g) => g.doNo === doNo);
      if (!group || !group.pickingPayload) return;
      console.log(
        "Initiating picking for DO:",
        doNo,
        "with payload:",
        group.pickingPayload
      );
      await initiatePicking(doNo, group.pickingPayload);
    },
    [pickingState]
  );

  const handlePickingAll = async () => {
    const pendingPickingGroups = pickingState.filter(
      (g) => g.status === "transferred"
    );
    await Promise.all(
      pendingPickingGroups.map((group) => handlePicking(group.doNo))
    );
  };

  const getStatusIcon = (status: "success" | "warning" | "error" | null) => {
    if (status === "success") {
      return <CheckIcon />;
    } else if (status === "error") {
      return <ErrorIcon />;
    }
    return null;
  };

  const getStatusBadge = (status: ODBGroup["status"]) => {
    const statusColors: Record<ODBGroup["status"], string> = {
      pending: "#6b7280",
      loading: "#f59e0b",
      transferred: "#3b82f6",
      picked: "#10b981",
      completed: "#047857",
      error: "#ef4444",
    };
    
    return (
      <View style={[styles.badge, { backgroundColor: statusColors[status] }]}>
        <Text style={styles.badgeText}>{status}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Picking Confirmation</Text>
        {allGroupsAreFinalized ? (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={onComplete}
          >
            <Text style={styles.buttonText}>Complete DockOut</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handlePickingAll}
          >
            <Text style={styles.buttonText}>Complete All Picking</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {pickingState.map((group) => {
          const sapResponse = sapResponses[group.doNo];
          const items = group.sapResponse?.d?.OrderToItem?.results || group.items;
          
          return (
            <View key={group.doNo} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>DO: {group.doNo}</Text>
                <Text style={styles.cardDescription}>
                  {items.length} line item(s)
                </Text>
              </View>
              
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={styles.tableHeaderCell}>Material</Text>
                  <Text style={styles.tableHeaderCell}>Quantity</Text>
                  <Text style={styles.tableHeaderCell}>Batch</Text>
                  <Text style={styles.tableHeaderCell}>Uecha</Text>
                  <Text style={styles.tableHeaderCell}>Bin</Text>
                  <Text style={styles.tableHeaderCell}>To Sloc</Text>
                  <Text style={styles.tableHeaderCell}>VEP</Text>
                  <Text style={styles.tableHeaderCell}>Item</Text>
                  <Text style={styles.tableHeaderCell}>Status</Text>
                </View>
                
                {items.map((item: any, index: number) => (
                  <View key={item.id || uuidv4()} style={styles.tableRow}>
                    <Text style={styles.tableCell}>{item.material || item.Matnr}</Text>
                    <Text style={styles.tableCell}>
                      {item.actualQuantity || item.Quantity} {item.uom || item.Uom}
                    </Text>
                    <Text style={styles.tableCell}>{item.actualBatch || item.Batch}</Text>
                    <Text style={styles.tableCell}>{item.uecha || item.UECHA}</Text>
                    <Text style={styles.tableCell}>{item.bin || item.Bin}</Text>
                    <Text style={styles.tableCell}>{item.destSloc || item.ToStorage}</Text>
                    <Text style={styles.tableCell}>{item.vepToken || item.VepToken}</Text>
                    <Text style={styles.tableCell}>{item.posnr || item.Posnr}</Text>
                    <View style={styles.tableCell}>
                      {getStatusBadge(group.status)}
                    </View>
                  </View>
                ))}
              </View>
              
              {group.status !== "picked" && (
                <TouchableOpacity
                  style={styles.pickingButton}
                  onPress={() => handlePicking(group.doNo)}
                >
                  <Text style={styles.pickingButtonText}>Complete Picking</Text>
                </TouchableOpacity>
              )}
              
              {sapResponse && (
                <View style={styles.responseContainer}>
                  <View style={styles.responseHeader}>
                    <View style={styles.responseTitle}>
                      {getStatusIcon(group.validation.status)}
                      <Text style={styles.responseTitleText}>SAP Response</Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => toggleRawResponse(group.doNo)}
                    >
                      {showRawResponse[group.doNo] ? <EyeOffIcon /> : <EyeIcon />}
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.responseBadges}>
                    <View style={[
                      styles.messageBadge,
                      group.validation.status === "success" 
                        ? styles.successBadge 
                        : styles.errorBadge
                    ]}>
                      <Text style={styles.messageText}>{sapResponse.message}</Text>
                    </View>
                    
                    {sapResponse.rescode && (
                      <View style={styles.codeBadge}>
                        <Text style={styles.codeText}>
                          Response Code: {sapResponse.rescode}
                        </Text>
                      </View>
                    )}
                  </View>
                  
                  {showRawResponse[group.doNo] && (
                    <View style={styles.rawResponse}>
                      <Text style={styles.rawResponseTitle}>Raw SAP Response:</Text>
                      <ScrollView style={styles.rawResponseContent}>
                        <Text style={styles.rawResponseText}>
                          {JSON.stringify(sapResponse.result, null, 2)}
                        </Text>
                      </ScrollView>
                    </View>
                  )}
                </View>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  primaryButton: {
    backgroundColor: '#007bff',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardDescription: {
    color: '#666',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 6,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    flex: 1,
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
  },
  pickingButton: {
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 16,
  },
  pickingButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
  responseContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    padding: 16,
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  responseTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  responseBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  messageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  successBadge: {
    backgroundColor: '#10b981',
  },
  errorBadge: {
    backgroundColor: '#ef4444',
  },
  messageText: {
    color: '#fff',
    fontSize: 12,
  },
  codeBadge: {
    backgroundColor: '#6b7280',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  codeText: {
    color: '#fff',
    fontSize: 12,
  },
  rawResponse: {
    marginTop: 12,
  },
  rawResponseTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  rawResponseContent: {
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    padding: 8,
    maxHeight: 200,
  },
  rawResponseText: {
    fontSize: 10,
    fontFamily: 'monospace',
  },
  icon: {
    fontSize: 16,
  },
});

export default SapPicking;

*/

import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
interface ODBItem {
  id: string;
  sNo: number;
  vepToken: string;
  doNo: string;
  wmsPicking: string;
  pickingStatus: string;
  pgiStatus: string;
  posnr: string;
  material: string;
  materialDes: string;
  qty: number;
  batch: string;
  uom: string;
  bin: string;
  storageType: string;
  destSloc: string;
  warehouse: string;
  storage: string;
  plant: string;
  dock: string;
  net: number;
  gross: number;
  truck: string;
  toNo: string;
  sequenceNo: string;
  channel: string;
  uecha: string;
  docCata?: string;
  actualBatch: string;
  actualQuantity: number;
  isNew: boolean;
  status: "pending" | "loading" | "transferred" | "picked" | "completed" | "error";
  errorMessage?: string;
}

interface ODBGroup {
  doNo: string;
  items: ODBItem[];
  status: "pending" | "loading" | "transferred" | "picked" | "completed" | "error";
  isEditing: boolean;
  validation: {
    status: "success" | "warning" | "error" | null;
    message: string | null;
  };
  pickingPayload?: any;
  sapResponse?: any;
}

interface SapPickingProps {
  odbGroups: ODBGroup[];
  onComplete: () => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    console.log('Credentials set for user:', username);
  },

  getStoredToken: (): string | null => {
    return null;
  },

  clearCredentials: (): void => {
    console.log('Credentials cleared');
  }
};

// Simple btoa implementation for React Native
const btoa = (input: string): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  let output = '';
  let i = 0;
  
  while (i < input.length) {
    const a = input.charCodeAt(i++);
    const b = input.charCodeAt(i++);
    const c = input.charCodeAt(i++);
    
    const index1 = a >> 2;
    const index2 = ((a & 3) << 4) | (b >> 4);
    const index3 = isNaN(b) ? 64 : ((b & 15) << 2) | (c >> 6);
    const index4 = isNaN(c) ? 64 : c & 63;
    
    output += chars.charAt(index1) + chars.charAt(index2) + chars.charAt(index3) + chars.charAt(index4);
  }
  
  return output;
};

// SAP Picking Status API call
const sendSapPickingStatus = async (pickingPayload: any): Promise<any> => {
  const username = "VERTIF_01";
  const password = "EmamiWM@Qas24";
  const basicAuth = BasicAuth.getAuthHeader(username, password);
  
  const sapUrl = "https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet";

  try {
    // Step 1: Get CSRF token and cookies from SAP
    const csrfResponse = await fetch(sapUrl, {
      method: "GET",
      headers: {
        "X-CSRF-Token": "Fetch",
        "Authorization": basicAuth,
        "Accept": "application/json",
      },
    });

    if (!csrfResponse.ok) {
      throw new Error(`Failed to get CSRF token: ${csrfResponse.status}`);
    }

    const csrfToken = csrfResponse.headers.get("X-CSRF-Token");
    if (!csrfToken) {
      throw new Error("Failed to obtain CSRF token from SAP");
    }

    // Step 2: Send the picking request with the obtained token
    const pickingResponse = await fetch(sapUrl, {
      method: "POST",
      headers: {
        "X-CSRF-Token": csrfToken,
        "Content-Type": "application/json",
        "Authorization": basicAuth,
        "Accept": "application/json",
      },
      body: JSON.stringify(pickingPayload),
    });

    if (!pickingResponse.ok) {
      throw new Error(`SAP picking failed: ${pickingResponse.status}`);
    }

    const result = await pickingResponse.json();
    return result;
  } catch (error) {
    console.error("SAP API Error:", error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EyeIcon = () => <Text style={styles.icon}>👁️</Text>;
const EyeOffIcon = () => <Text style={styles.icon}>🚫</Text>;
const ExpandIcon = () => <Text style={styles.icon}>⬇️</Text>;
const CollapseIcon = () => <Text style={styles.icon}>⬆️</Text>;

const SapPicking: React.FC<SapPickingProps> = ({ odbGroups, onComplete }) => {
  const [pickingState, setPickingState] = useState(odbGroups);
  const [sapResponses, setSapResponses] = useState<Record<string, any>>({});
  const [showRawResponse, setShowRawResponse] = useState<Record<string, boolean>>({});
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

  const toggleRawResponse = (doNo: string) => {
    setShowRawResponse((prev) => ({ ...prev, [doNo]: !prev[doNo] }));
  };

  const toggleGroupExpansion = (doNo: string) => {
    setExpandedGroups((prev) => ({ ...prev, [doNo]: !prev[doNo] }));
  };

  const useAllGroupsAreFinalized = useMemo(() => {
    return (
      pickingState.length > 0 &&
      pickingState.every(
        (group) => group.status === "picked" || group.status === "completed"
      )
    );
  }, [pickingState]);

  const initiatePicking = async (doNo: string, pickingPayload: any): Promise<void> => {
    setPickingState((prev) =>
      prev.map((g) => (g.doNo === doNo ? { ...g, status: "loading" } : g))
    );

    try {
      const data = await sendSapPickingStatus(pickingPayload);

      setSapResponses((prev) => ({ ...prev, [doNo]: data }));

      let newStatus: ODBGroup["status"] = "error";
      const rescode = (data?.rescode ?? data?.d?.rescode ?? "")
        .toString()
        .trim()
        .toLowerCase();
      const messageRaw = (
        data?.message ??
        data?.d?.message ??
        ""
      ).toString();
      const message = messageRaw.trim().toLowerCase();

      if (rescode === "s" || rescode === "c") {
        newStatus = "picked";
      }

      const successPhrases = [
        "DO already has an existing TO",
        "already has an existing to",
        "do already has",
        "success",
        "picked",
        "already exists",
      ];

      if (newStatus !== "picked") {
        for (const phrase of successPhrases) {
          if (phrase && message.includes(phrase.toLowerCase())) {
            newStatus = "picked";
            break;
          }
        }
      }

      setPickingState((prev) =>
        prev.map((g) =>
          g.doNo === doNo
            ? {
                ...g,
                status: newStatus,
                validation: {
                  status: newStatus === "picked" ? "success" : "error",
                  message: messageRaw || "Picking completed",
                },
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Picking confirmation failed.";
      console.error("initiatePicking error", doNo, err);
      setPickingState((prev) =>
        prev.map((g) =>
          g.doNo === doNo
            ? {
                ...g,
                status: "error",
                validation: { status: "error", message: errorMessage },
              }
            : g
        )
      );
    }
  };

  const handlePicking = useCallback(
    async (doNo: string): Promise<void> => {
      const group = pickingState.find((g) => g.doNo === doNo);
      if (!group || !group.pickingPayload) return;
      console.log(
        "Initiating picking for DO:",
        doNo,
        "with payload:",
        group.pickingPayload
      );
      await initiatePicking(doNo, group.pickingPayload);
    },
    [pickingState]
  );

  const handlePickingAll = async () => {
    const pendingPickingGroups = pickingState.filter(
      (g) => g.status === "transferred"
    );
    await Promise.all(
      pendingPickingGroups.map((group) => handlePicking(group.doNo))
    );
  };

  const getStatusIcon = (status: "success" | "warning" | "error" | null) => {
    if (status === "success") {
      return <CheckIcon />;
    } else if (status === "error") {
      return <ErrorIcon />;
    }
    return null;
  };

  const getStatusBadge = (status: ODBGroup["status"]) => {
    const statusColors: Record<ODBGroup["status"], string> = {
      pending: "#6b7280",
      loading: "#f59e0b",
      transferred: "#3b82f6",
      picked: "#10b981",
      completed: "#047857",
      error: "#ef4444",
    };
    
    return (
      <View style={[styles.badge, { backgroundColor: statusColors[status] }]}>
        <Text style={styles.badgeText}>{status.toUpperCase()}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Picking Confirmation</Text>
        {useAllGroupsAreFinalized ? (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={onComplete}
          >
            <Text style={styles.buttonText}>Complete DockOut</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={handlePickingAll}
          >
            <Text style={styles.buttonText}>Complete All Picking</Text>
            <ArrowRightIcon />
          </TouchableOpacity>
        )}
      </View>
      
      <ScrollView style={styles.scrollView}>
        {pickingState.map((group) => {
          const sapResponse = sapResponses[group.doNo];
          const items = group.sapResponse?.d?.OrderToItem?.results || group.items;
          const isExpanded = expandedGroups[group.doNo];
          
          return (
            <View key={group.doNo} style={styles.card}>
              <TouchableOpacity 
                style={styles.cardHeader}
                onPress={() => toggleGroupExpansion(group.doNo)}
              >
                <View style={styles.cardHeaderContent}>
                  <Text style={styles.cardTitle}>DO: {group.doNo}</Text>
                  <Text style={styles.cardDescription}>
                    {items.length} line item(s)
                  </Text>
                </View>
                <View style={styles.cardHeaderActions}>
                  {getStatusBadge(group.status)}
                  {isExpanded ? <CollapseIcon /> : <ExpandIcon />}
                </View>
              </TouchableOpacity>
              
              {isExpanded && (
                <>
                  <ScrollView horizontal style={styles.tableContainer}>
                    <View style={styles.table}>
                      <View style={styles.tableHeader}>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Material</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>Quantity</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>Batch</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>Uecha</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>Bin</Text>
                        <Text style={[styles.tableHeaderCell, { width: 80 }]}>To Sloc</Text>
                        <Text style={[styles.tableHeaderCell, { width: 150 }]}>VEP</Text>
                        <Text style={[styles.tableHeaderCell, { width: 60 }]}>Item</Text>
                        <Text style={[styles.tableHeaderCell, { width: 100 }]}>Status</Text>
                      </View>
                      
                      {items.map((item: any, index: number) => (
                        <View key={item.id || uuidv4()} style={styles.tableRow}>
                          <Text style={[styles.tableCell, { width: 100 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.material || item.Matnr}
                          </Text>
                          <Text style={[styles.tableCell, { width: 80 }]}>
                            {item.actualQuantity || item.Quantity} {item.uom || item.Uom}
                          </Text>
                          <Text style={[styles.tableCell, { width: 80 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.actualBatch || item.Batch}
                          </Text>
                          <Text style={[styles.tableCell, { width: 80 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.uecha || item.UECHA}
                          </Text>
                          <Text style={[styles.tableCell, { width: 80 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.bin || item.Bin}
                          </Text>
                          <Text style={[styles.tableCell, { width: 80 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.destSloc || item.ToStorage}
                          </Text>
                          <Text style={[styles.tableCell, { width: 150 }]} numberOfLines={1} ellipsizeMode="tail">
                            {item.vepToken || item.VepToken}
                          </Text>
                          <Text style={[styles.tableCell, { width: 60 }]}>
                            {item.posnr || item.Posnr}
                          </Text>
                          <View style={[styles.tableCell, { width: 100 }]}>
                            {getStatusBadge(group.status)}
                          </View>
                        </View>
                      ))}
                    </View>
                  </ScrollView>
                  
                  {group.status !== "picked" && group.status !== "completed" && (
                    <TouchableOpacity
                      style={[
                        styles.pickingButton,
                        group.status === "loading" && styles.pickingButtonDisabled
                      ]}
                      onPress={() => handlePicking(group.doNo)}
                      disabled={group.status === "loading"}
                    >
                      {group.status === "loading" ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.pickingButtonText}>Complete Picking</Text>
                      )}
                    </TouchableOpacity>
                  )}
                  
                  {sapResponse && (
                    <View style={styles.responseContainer}>
                      <View style={styles.responseHeader}>
                        <View style={styles.responseTitle}>
                          {getStatusIcon(group.validation.status)}
                          <Text style={styles.responseTitleText}>SAP Response</Text>
                        </View>
                        <TouchableOpacity
                          onPress={() => toggleRawResponse(group.doNo)}
                        >
                          {showRawResponse[group.doNo] ? <EyeOffIcon /> : <EyeIcon />}
                        </TouchableOpacity>
                      </View>
                      
                      <View style={styles.responseBadges}>
                        <ScrollView horizontal style={styles.messageScrollContainer}>
                          <View style={[
                            styles.messageBadge,
                            group.validation.status === "success" 
                              ? styles.successBadge 
                              : styles.errorBadge
                          ]}>
                            <Text style={styles.messageText}>
                              {sapResponse.message || group.validation.message || "No message available"}
                            </Text>
                          </View>
                        </ScrollView>
                        
                        {sapResponse.rescode && (
                          <View style={styles.codeBadge}>
                            <Text style={styles.codeText}>
                              Response Code: {sapResponse.rescode}
                            </Text>
                          </View>
                        )}
                      </View>
                      
                      {showRawResponse[group.doNo] && (
                        <View style={styles.rawResponse}>
                          <Text style={styles.rawResponseTitle}>Raw SAP Response:</Text>
                          <View style={styles.rawResponseContent}>
                              <Text style={styles.rawResponseText}>
                                {JSON.stringify(sapResponse, null, 2)}
                              </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}
                </>
              )}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const { width, height } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButton: {
    backgroundColor: '#3b82f6',
  },
  completeButton: {
    backgroundColor: '#10b981',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f1f5f9',
  },
  cardHeaderContent: {
    flex: 1,
  },
  cardHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 4,
  },
  cardDescription: {
    color: '#64748b',
    fontSize: 14,
  },
  tableContainer: {
    maxHeight: 300,
  },
  table: {
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    fontSize: 12,
    textAlign: 'center',
    color: '#475569',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    alignItems: 'center',
  },
  tableCell: {
    fontSize: 12,
    textAlign: 'center',
    color: '#334155',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  pickingButton: {
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    margin: 16,
    marginTop: 8,
  },
  pickingButtonDisabled: {
    backgroundColor: '#93c5fd',
  },
  pickingButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
  responseContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    margin: 16,
    marginTop: 0,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  responseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  responseTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  responseTitleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  responseBadges: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 12,
  },
  messageScrollContainer: {
    maxHeight: 60,
  },
  messageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: width - 80,
  },
  successBadge: {
    backgroundColor: '#10b981',
  },
  errorBadge: {
    backgroundColor: '#ef4444',
  },
  messageText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    padding: 4,
  },
  codeBadge: {
    backgroundColor: '#64748b',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  codeText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rawResponse: {
    marginTop: 12,
  },
  rawResponseTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#334155',
  },
  rawResponseContent: {
    backgroundColor: '#f1f5f9',
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  rawResponseText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#475569',
    lineHeight: 16,
  },
  icon: {
    fontSize: 16,
  },
});

export default SapPicking;


