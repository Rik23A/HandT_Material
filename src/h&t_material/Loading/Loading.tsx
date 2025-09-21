

import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
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
  status: 'pending' | 'loading' | 'transferred' | 'picked' | 'completed' | 'error';
  errorMessage?: string;
  originalQuantity: number;
  originalBatch: string;
}

interface ODBGroup {
  doNo: string;
  items: ODBItem[];
  status: 'pending' | 'loading' | 'transferred' | 'picked' | 'completed' | 'error';
  isEditing: boolean;
  validation: {
    status: 'success' | 'warning' | 'error' | null;
    message: string | null;
  };
}

interface LoadingProps {
  onLoadingComplete: (groups: ODBGroup[]) => void;
}

// Simple UUID generator (replaces uuidv4)
const generateId = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    // Using a simple base64 implementation for React Native
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

// SAP Picking API call
const fetchSapPickingData = async (token: string): Promise<any> => {
  const username = "VERTIF_01";
  const password = "EmamiWM@Qas24";
  const basicAuth = BasicAuth.getAuthHeader(username, password);
  
  // SAP OData URL with expansion
  const sapUrl = `https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet(tokenno='${token}')?$expand=getloadingsequence`;

  const response = await fetch(sapUrl, {
    method: "GET",
    headers: {
      Authorization: basicAuth,
      Accept: "application/json",
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    let errorMessage = "Failed to fetch SAP picking data";
    
    try {
      const responseText = await response.text();
      
      // Try to parse as JSON first
      try {
        const errorJson = JSON.parse(responseText);
        if (errorJson.error) {
          if (errorJson.error.message?.value) {
            errorMessage = errorJson.error.message.value;
          } else if (errorJson.error.message) {
            errorMessage = errorJson.error.message;
          }
        }
      } catch {
        // If not JSON, use the text response
        if (responseText.includes("Invalid") || responseText.includes("Error")) {
          errorMessage = responseText.substring(0, 200);
        }
      }
    } catch {
      // If we can't read the error response, use the status text
      errorMessage = `${response.status} ${response.statusText}`;
    }
    
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  
  if (contentType && contentType.includes("application/json")) {
    const data = await response.json();
    return data;
  } else {
    const responseText = await response.text();
    throw new Error("SAP API returned non-JJSON response");
  }
};

// Simple icons using text (replacing lucide-react-native)
const TruckIcon = () => <Text style={styles.icon}>🚚</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const ErrorIcon = () => <Text style={styles.icon}>⚠️</Text>;

const Loading: React.FC<LoadingProps> = ({ onLoadingComplete }) => {
  const [vepToken, setVepToken] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVepTokenData = async () => {
    if (!vepToken.trim()) {
      setError("Please enter a VEP Token.");
      return;
    }
    setIsLoading(true);
    setError(null);
    
    try {
      const data = await fetchSapPickingData(vepToken);
      
      // Extract sequence results
      const sequenceResults = data.d?.getloadingsequence?.results || [];
      const dock = data.d || {};

      const formattedData = sequenceResults.map((item: any, index: number) => ({
        SNo: index + 1,
        VEPToken: dock.TokenNo || vepToken,
        DONo: item.obd_no || "N/A",
        WMSPicking: item.LVSTK || "N/A",
        PickingStatus: item.KOSTK || "N/A",
        PGIStatus: item.WBSTK || "N/A",
        Posnr: item.posnr || "N/A",
        Material: item.matnr || "N/A",
        MaterialDes: item.maktx || "N/A",
        Qty: item.lfimg || "N/A",
        Batch: item.oldcharg || "N/A",
        BatchOld: item.oldcharg || "N/A",
        UOM: item.meins || "N/A",
        Bin: item.lgpla || "N/A",
        StorageType: item.lgtyp || "",
        Warehouse: item.lgnum || "N/A",
        Storage: item.lgort || "N/A",
        Plant: item.werks || "N/A",
        Dock: item.docknum || "N/A",
        DocCata: item.pstyv || "N/A",
        Ind: item.speLoekz || "N/A",
        Net: item.ntgew || "N/A",
        Gross: item.brgew || "N/A",
        Truck: item.bolnr || "N/A",
        ToNo: item.tanum || "N/A",
        SequenceNo: item.sequenceno || "N/A",
        Channel: item.vtweg || "N/A",
        Uecha: item.uecha || "N/A",
      }));

      const sapDataArray = Array.isArray(formattedData) ? formattedData : [formattedData];
      const groupedData: Record<string, ODBItem[]> = {};

      if (sapDataArray.length === 0) {
        throw new Error("No data found for the provided VEP Token.");
      }

      sapDataArray.forEach((item: any, index: number) => {
        const doNo = item.DONo || item.obd_no || item.DeliveryOrder || item.OBD || item.VBELN || `DO-${index + 1}`;
        if (!groupedData[doNo]) {
          groupedData[doNo] = [];
        }

        const initialQty = Number.parseFloat(item.Qty || "0");
        const initialBatch = item.Batch || `BATCH-${index + 1}`;
        
        // Determine the initial status based on pickingStatus
        const initialStatus = item.PickingStatus?.toUpperCase() === "C" ? "completed" : "pending";

        groupedData[doNo].push({
          id: generateId(),
          sNo: item.SNo || index + 1,
          vepToken: item.VEPToken || vepToken,
          doNo,
          wmsPicking: item.WMSPicking || "N/A",
          pickingStatus: item.PickingStatus || "N/A",
          pgiStatus: item.PGIStatus || "N/A",
          posnr: item.Posnr || `${index + 1}0`,
          material: item.Material || `MAT-${index + 1}`,
          materialDes: item.MaterialDes || "Material Description",
          qty: initialQty,
          batch: initialBatch,
          uom: item.UOM || "KG",
          bin: item.Bin || "BIN-001",
          storageType: "EDO", // Default value
          destSloc: "ZF05", // Default value
          warehouse: item.Warehouse || "WH-001",
          storage: item.Storage || "SL-001",
          plant: item.Plant || "P001",
          dock: item.Dock || "DOCK-1",
          docCata: item.DocCata,
          net: Number.parseFloat(item.Net || "0"),
          gross: Number.parseFloat(item.Gross || "0"),
          truck: item.Truck || "TRUCK-001",
          toNo: item.ToNo || "TO-001",
          sequenceNo: item.SequenceNo || `${index + 1}`,
          channel: item.Channel || "01",
          uecha: item.Uecha || "",
          actualBatch: initialBatch,
          actualQuantity: initialQty,
          isNew: false,
          status: initialStatus,
          originalQuantity: initialQty,
          originalBatch: initialBatch,
        } as ODBItem);
      });
      
      const odbGroups: ODBGroup[] = Object.entries(groupedData).map(([doNo, items]) => {
        // Check if all items in the group are completed
        const isGroupCompleted = items.every(item => item.status === "completed");
        return {
          doNo,
          items,
          status: isGroupCompleted ? "completed" : "pending",
          isEditing: false,
          validation: { status: null, message: null },
        };
      });

      onLoadingComplete(odbGroups);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (event: any) => {
    // Trigger data fetching when the Enter key is pressed and a token is entered
    if (event.nativeEvent.key === 'Enter' && vepToken.trim() && !isLoading) {
      fetchVepTokenData();
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.titleContainer}>
          <TruckIcon />
          <Text style={styles.cardTitle}>Enter VEP Token</Text>
        </View>
        <Text style={styles.cardDescription}>Enter the VEP Token to fetch Outbound Delivery details.</Text>
      </View>
      
      <View style={styles.cardContent}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>VEP Token Number</Text>
          <TextInput
            style={styles.input}
            value={vepToken}
            onChangeText={setVepToken}
            onKeyPress={handleKeyDown}
            placeholder="e.g., 2025-M251-0000012345"
          />
        </View>
        
        <TouchableOpacity
          style={[styles.button, (isLoading || !vepToken.trim()) && styles.disabledButton]}
          onPress={fetchVepTokenData}
          disabled={isLoading || !vepToken.trim()}
        >
          {isLoading ? (
            <>
              <ActivityIndicator size="small" color="#fff" />
              <Text style={styles.buttonText}>Fetching Data...</Text>
            </>
          ) : (
            <>
              <ArrowRightIcon />
              <Text style={styles.buttonText}>Fetch ODB Details</Text>
            </>
          )}
        </TouchableOpacity>
        
        {error && (
          <View style={styles.errorContainer}>
            <ErrorIcon />
            <Text style={styles.errorTitle}>Error</Text>
            <Text style={styles.errorDescription}>{error}</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#007bff',
  },
  cardDescription: {
    color: '#666',
  },
  cardContent: {
    padding: 16,
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    marginBottom: 5,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    flexWrap: 'wrap',
  },
  errorTitle: {
    color: '#dc2626',
    fontWeight: 'bold',
  },
  errorDescription: {
    color: '#dc2626',
    flex: 1,
  },
  icon: {
    fontSize: 16,
  },
});

export default Loading;