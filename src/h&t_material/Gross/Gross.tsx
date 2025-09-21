/*

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, RefreshCcw } from 'lucide-react-native';

// --- Type Definitions ---
interface SapDataItem {
  tokenno: string;
  obd_no: string;
  posnr: string;
  lfimg: string;
  prqty: string;
  matnr: string;
  uecha: string;
  charg: string;
  ntgew: string;
  brgew: string;
  lgort: string;
  werks: string;
}

interface SapData {
  d: {
    results: SapDataItem[];
  };
}

interface AdditionalMaterial {
  materialId: string;
  quantity: string;
  uom: string;
}

interface GrossProps {
  onStartNew: () => void;
  initialVepToken?: string;
}

// Material and UOM options
const materialOptions = [
  { label: 'Select Material', value: '' },
  { label: 'Husk', value: 'Husk' },
  { label: 'Ply', value: 'Ply' },
  { label: 'Wastage Carton', value: 'Wastage Carton' },
  { label: 'Hardboard', value: 'Hardboard' },
  { label: 'Ply 3mm', value: 'Ply 3mm' },
  { label: 'Black Polythene Paper', value: 'Black Polythene Paper' },
  { label: 'Tarpoline', value: 'Tarpoline' },
  { label: 'Tin Sheet', value: 'Tin Sheet' },
  { label: 'Gift Items', value: 'Gift Items' },
];

const uomOptions = [
  { label: 'Kilogram (KG)', value: 'KG' },
  { label: 'Gram (G)', value: 'G' },
  { label: 'Piece (PC)', value: 'PC' },
];

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = btoa(`${username}:${password}`);
    return `Basic ${token}`;
  },

  setCredentials: (username: string, password: string): void => {
    const token = btoa(`${username}:${password}`);
    // Using AsyncStorage instead of localStorage in React Native
    // You'll need to implement AsyncStorage or another storage solution
    console.log('Credentials set for user:', username);
  },

  getStoredToken: (): string | null => {
    // Using AsyncStorage instead of localStorage in React Native
    // You'll need to implement AsyncStorage or another storage solution
    return null;
  },

  clearCredentials: (): void => {
    console.log('Credentials cleared');
  }
};

// API service functions
const ApiService = {
  get: async (url: string, requiresAuth: boolean = false): Promise<any> => {
    const headers: HeadersInit_ = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = BasicAuth.getStoredToken();
      if (token) {
        headers['Authorization'] = `Basic ${token}`;
      }
    }

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  post: async (url: string, data: any, requiresAuth: boolean = false): Promise<any> => {
    const headers: HeadersInit_ = {
      'Content-Type': 'application/json',
    };

    if (requiresAuth) {
      const token = BasicAuth.getStoredToken();
      if (token) {
        headers['Authorization'] = `Basic ${token}`;
      }
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return response.json();
  },
};

// SAP Proxy API call
const fetchSapData = async (token: string): Promise<SapData> => {
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  const basicAuth = BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD);
  
  const sapUrl = `https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/LoadedDetailsSet?$filter=tokenno eq '${token}'`;

  const response = await fetch(sapUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": basicAuth,
      "sap-client": SAP_CLIENT,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch from SAP");
  }

  return response.json();
};

// TEG Auth API call
const fetchTegAuthToken = async (): Promise<string> => {
  const TEG_USERNAME = "WmsIntegrationOperator";
  const TEG_PASSWORD = "Operator@2025";
  
  const authUrl = "https://beta-api-admin.transporteg.com/api/0.1/fetch/master/token";
  const authPayload = {
    username: TEG_USERNAME,
    password: TEG_PASSWORD,
  };

  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authPayload),
  });
console.log('TEG Auth Response Status:', response .body);
  if (!response.ok) {
    throw new Error("Failed to authenticate with TEG");
  }

  const data = await response.json();
  let token = data.data.token  || data.authToken;
console.log('TEG Auth Token:', token,"and",data.data.token);
  if (!token) {
    throw new Error("No token received from TEG API");
  }

  return token;
};

// TEG Update API call
const sendTegUpdate = async (tegToken: string, payload: any): Promise<any> => {
  const updateUrl = "https://beta-apis-indenting.transporteg.com/indent/api/0.1/update/wms/picking/data";
  
  const response = await fetch(updateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": tegToken,
    },
    body: JSON.stringify(payload),
  });
  const TegResponse= response.json();

console.log('TEG Update Payload:',"and",TegResponse);
console.log('TEG payload:', payload.JSONstringify);
  if (!response.ok) {
    throw new Error("Failed to update TEG data");
  }

  return response.json();
};

// Additional Materials API call
const sendAdditionalMaterials = async (tegToken: string, payload: any): Promise<any> => {
  const url = "https://beta-apis-indenting.transporteg.com/indent/api/0.2/update/wms/additional/material";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": tegToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save additional materials");
  }

  return response.json();
};

// Login Component
interface LoginProps {
  onLogin: (username: string, password: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }
    setError('');
    onLogin(username, password);
  };

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>Login</Text>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Username:</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Enter username"
        />
      </View>
      <View style={styles.inputContainer}>
        <Text style={styles.label}>Password:</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder="Enter password"
          secureTextEntry
        />
      </View>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
      <TouchableOpacity style={styles.loginButton} onPress={handleSubmit}>
        <Text style={styles.loginButtonText}>Login</Text>
      </TouchableOpacity>
    </View>
  );
};

// Main App Component
const Gross: React.FC<GrossProps> = ({ onStartNew, initialVepToken }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [vepToken, setVepToken] = useState<string>(initialVepToken || '');
  const [loadingSequence, setLoadingSequence] = useState<SapDataItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'data-loaded' | 'completed'>('initial');
  const [showAdditionalMaterialPopup, setShowAdditionalMaterialPopup] = useState<boolean>(false);
  const [additionalMaterials, setAdditionalMaterials] = useState<AdditionalMaterial[]>([{ materialId: '', quantity: '', uom: '' }]);
  const [lastUpdateAttempt, setLastUpdateAttempt] = useState<{ isCompleted: boolean; materials: AdditionalMaterial[] | null } | null>(null);

  const totalBrgew = useMemo(() => {
    if (!loadingSequence) return 0;
    return loadingSequence.reduce((sum, item) => sum + parseFloat(item.brgew || '0'), 0);
  }, [loadingSequence]);

  const handleLogin = (username: string, password: string) => {
    BasicAuth.setCredentials(username, password);
    setIsAuthenticated(true);
    setError('');
  };

  const handleFetchData = useCallback(async (token: string) => {
    if (!token) {
      setError('VEP Token is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLoadingSequence(null);

    try {
      const data = await fetchSapData(token);
      const results = data.d.results;

      if (results.length === 0) {
        setError('No data found for the provided VEP Token.');
        setStep('initial');
        return;
      }

      const isValid = results.every(item => item.lfimg === item.prqty);
      if (!isValid) {
        setError(' OBD QTY and LOADED QTY fields do not match for all items.');
        setLoadingSequence(results);
        setStep('data-loaded'); // Still show data but with an error
      } else {
        setLoadingSequence(results);
        setStep('data-loaded');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialVepToken) {
      handleFetchData(initialVepToken);
    }
  }, [initialVepToken, handleFetchData]);

  const processTegUpdate = async (isCompleted: boolean, materials: AdditionalMaterial[] | null = null) => {
    setIsLoading(true);
    setError(null);
    setLastUpdateAttempt({ isCompleted, materials });

    try {
      // 1. Get TEG Auth Token
      const tegToken = await fetchTegAuthToken();
      if (!tegToken) throw new Error('TEG Authentication token not received.');

      // 2. Send TEG Update with the new payload structure
      const tegUpdatePayload = {
        token: vepToken,
        isLoadingCompleted: isCompleted,
        loadingDetails: loadingSequence?.map(item => ({
          doNumber: item.obd_no,
          quantity: item.prqty,
          batchNo: item.charg,
          batchLineNo: item.posnr || '900005',
          storageLocation: item.lgort,
          batchQuantity: item.lfimg,
          loadedQuantity: item.lfimg,
          materialCode: item.matnr,
          actualWeight: item.ntgew || '1183.096',
          lineItem: !item.uecha || item.uecha === '000000' ? '000010' : item.uecha,
          chargedWeight: item.brgew || '2127.870',
        })),
      };

      await sendTegUpdate(tegToken, tegUpdatePayload);

      // 3. If additional materials exist, send them
      if (materials && materials.length > 0 && materials[0].materialId) {
        const additionalMaterialsPayload = {
          token: vepToken,
          isLoadingCompleted: true,
          additionalMaterials: materials.map(row => ({
            materialDescription: row.materialId,
            chargedWeight: row.quantity,
            uom: row.uom,
          })),
        };
        await sendAdditionalMaterials(tegToken, additionalMaterialsPayload);
      }

      setStep('completed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred during the update process.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryUpdate = () => {
    if (lastUpdateAttempt) {
      processTegUpdate(lastUpdateAttempt.isCompleted, lastUpdateAttempt.materials);
    }
  };

  const handleAddAdditionalMaterial = () => {
    processTegUpdate(false, additionalMaterials);
    setShowAdditionalMaterialPopup(false);
  };

  const handleAdditionalMaterialChange = (index: number, field: keyof AdditionalMaterial, value: string) => {
    const newMaterials = [...additionalMaterials];
    newMaterials[index][field] = value;
    setAdditionalMaterials(newMaterials);
  };

  const addAdditionalMaterialRow = () => {
    setAdditionalMaterials([...additionalMaterials, { materialId: '', quantity: '', uom: '' }]);
  };

  const handleStartNew = () => {
    setVepToken('');
    setLoadingSequence(null);
    setIsLoading(false);
    setError(null);
    setStep('initial');
    setAdditionalMaterials([{ materialId: '', quantity: '', uom: '' }]);
    setLastUpdateAttempt(null);
    onStartNew();
  };

  const renderInitialStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Gross Weight Check</Text>
      <Text style={styles.cardDescription}>Fetching SAP data for VEP Token...</Text>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0000ff" />
          <Text>Loading data...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={20} color="#dc2626" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => handleFetchData(vepToken)}>
            <RefreshCcw size={16} color="#000" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderDataLoadedStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>SAP Data for VEP Token: {vepToken}</Text>
      <Text style={styles.cardDescription}>Review the data below. OBD Qty and Loaded Qty must match to proceed without errors.</Text>
      
      {error && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={20} color="#dc2626" />
          <Text style={styles.errorTitle}>Validation Failed</Text>
          <Text style={styles.errorDescription}>{error}</Text>
        </View>
      )}
      
      <View style={styles.totalWeightContainer}>
        <Text style={styles.totalWeightLabel}>Total Gross Weight: </Text>
        <Text style={styles.totalWeightValue}>{totalBrgew.toFixed(2)} KG</Text>
      </View>
      
      <ScrollView horizontal>
        <View>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderCell}>OBD</Text>
            <Text style={styles.tableHeaderCell}>Material</Text>
            <Text style={styles.tableHeaderCell}>Ponsr</Text>
            <Text style={styles.tableHeaderCell}>Actual Weight</Text>
            <Text style={styles.tableHeaderCell}>Gross Weight</Text>
            <Text style={styles.tableHeaderCell}>OBD Qty</Text>
            <Text style={styles.tableHeaderCell}>Loaded Qty</Text>
            <Text style={styles.tableHeaderCell}>Batch</Text>
            <Text style={styles.tableHeaderCell}>Location</Text>
            <Text style={styles.tableHeaderCell}>Item</Text>
          </View>
          
          {loadingSequence?.map((item, index) => (
            <View 
              key={index} 
              style={[
                styles.tableRow,
                item.lfimg !== item.prqty ? styles.errorRow : null
              ]}
            >
              <Text style={styles.tableCell}>{item.obd_no}</Text>
              <Text style={styles.tableCell}>{item.matnr}</Text>
              <Text style={styles.tableCell}>{item.posnr}</Text>
              <Text style={styles.tableCell}>{item.ntgew}</Text>
              <Text style={styles.tableCell}>{item.brgew}</Text>
              <Text style={styles.tableCell}>{item.lfimg}</Text>
              <Text style={styles.tableCell}>{item.prqty}</Text>
              <Text style={styles.tableCell}>{item.charg}</Text>
              <Text style={styles.tableCell}>{item.lgort}</Text>
              <Text style={styles.tableCell}>{item.uecha}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[styles.button, styles.outlineButton, (isLoading || error) ? styles.disabledButton : null]}
          disabled={isLoading || !!error}
          onPress={() => setShowAdditionalMaterialPopup(true)}
        >
          <Text style={styles.buttonText}>Add Additional Material</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, (isLoading || error) ? styles.disabledButton : null]}
          disabled={isLoading || !!error}
          onPress={() => processTegUpdate(true)}
        >
          {isLoading && <ActivityIndicator size="small" color="#fff" />}
          <Text style={styles.buttonText}>Continue without Additional Material</Text>
        </TouchableOpacity>
        
        {error && (
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton]}
            onPress={handleRetryUpdate}
            disabled={isLoading}
          >
            <RefreshCcw size={16} color="#000" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
      
      <Modal
        visible={showAdditionalMaterialPopup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdditionalMaterialPopup(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Additional Material</Text>
            
            <ScrollView>
              {additionalMaterials.map((mat, index) => (
                <View key={index} style={styles.materialRow}>
                  <View style={styles.selectContainer}>
                    <Text style={styles.label}>Material</Text>
                    <View style={styles.select}>
                      {materialOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.option,
                            mat.materialId === option.value ? styles.selectedOption : null
                          ]}
                          onPress={() => handleAdditionalMaterialChange(index, 'materialId', option.value)}
                        >
                          <Text>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                  
                  <View style={styles.inputContainer}>
                    <Text style={styles.label}>Quantity</Text>
                    <TextInput
                      style={styles.input}
                      value={mat.quantity}
                      onChangeText={(value) => handleAdditionalMaterialChange(index, 'quantity', value)}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.selectContainer}>
                    <Text style={styles.label}>UOM</Text>
                    <View style={styles.select}>
                      {uomOptions.map((option) => (
                        <TouchableOpacity
                          key={option.value}
                          style={[
                            styles.option,
                            mat.uom === option.value ? styles.selectedOption : null
                          ]}
                          onPress={() => handleAdditionalMaterialChange(index, 'uom', option.value)}
                        >
                          <Text>{option.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              ))}
              
              <TouchableOpacity style={styles.addRowButton} onPress={addAdditionalMaterialRow}>
                <Text style={styles.addRowButtonText}>Add Row</Text>
              </TouchableOpacity>
            </ScrollView>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.button, styles.outlineButton]}
                onPress={() => setShowAdditionalMaterialPopup(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.button, isLoading ? styles.disabledButton : null]}
                onPress={handleAddAdditionalMaterial}
                disabled={isLoading}
              >
                {isLoading && <ActivityIndicator size="small" color="#fff" />}
                <Text style={styles.buttonText}>Add and Complete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );

  const renderCompletedStep = () => (
    <View style={[styles.card, styles.completedCard]}>
      <Text style={styles.completedTitle}>Process Completed!</Text>
      <Text style={styles.completedDescription}>All updates have been sent successfully.</Text>
      
      <CheckCircle size={64} color="#22c55e" style={styles.successIcon} />
      
      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={handleStartNew}>
        <Text style={styles.buttonText}>Start New VEP Token</Text>
      </TouchableOpacity>
    </View>
  );

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  switch (step) {
    case 'data-loaded':
      return renderDataLoadedStep();
    case 'completed':
      return renderCompletedStep();
    case 'initial':
    default:
      return renderInitialStep();
  }
};

const styles = StyleSheet.create({
  loginContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  loginTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 15,
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
  loginButton: {
    backgroundColor: '#007bff',
    padding: 15,
    borderRadius: 5,
    alignItems: 'center',
  },
  loginButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  errorText: {
    color: '#dc2626',
    marginBottom: 15,
    textAlign: 'center',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  cardDescription: {
    color: '#666',
    marginBottom: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 6,
    padding: 16,
    marginBottom: 16,
  },
  errorTitle: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginTop: 8,
  },
  errorDescription: {
    color: '#dc2626',
    marginVertical: 8,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 8,
    marginTop: 8,
  },
  retryButtonText: {
    marginLeft: 8,
  },
  totalWeightContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: 16,
  },
  totalWeightLabel: {
    fontWeight: '600',
    fontSize: 14,
  },
  totalWeightValue: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#16a34a',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    padding: 8,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    padding: 8,
    minWidth: 100,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
  },
  errorRow: {
    backgroundColor: '#fef2f2',
  },
  buttonContainer: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563eb',
    padding: 12,
    borderRadius: 6,
    gap: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  materialRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  selectContainer: {
    flex: 1,
  },
  select: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
  },
  option: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  selectedOption: {
    backgroundColor: '#dbeafe',
  },
  addRowButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  addRowButtonText: {
    color: '#374151',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  completedCard: {
    alignItems: 'center',
    padding: 32,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 8,
  },
  completedDescription: {
    color: '#6b7280',
    marginBottom: 24,
  },
  successIcon: {
    marginBottom: 24,
  },
});

export default Gross;

*/



import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Dimensions,
} from 'react-native';
import { CheckCircle, XCircle, AlertTriangle, RefreshCcw, Plus, X, ChevronDown } from 'lucide-react-native';

// --- Type Definitions ---
interface SapDataItem {
  tokenno: string;
  obd_no: string;
  posnr: string;
  lfimg: string;
  prqty: string;
  matnr: string;
  uecha: string;
  charg: string;
  ntgew: string;
  brgew: string;
  lgort: string;
  werks: string;
}

interface SapData {
  d: {
    results: SapDataItem[];
  };
}

interface AdditionalMaterial {
  materialId: string;
  quantity: string;
  uom: string;
}

interface GrossProps {
  onStartNew: () => void;
  initialVepToken?: string;
}

// Material and UOM options
const materialOptions = [
  { label: 'Select Material', value: '' },
  { label: 'Husk', value: 'Husk' },
  { label: 'Ply', value: 'Ply' },
  { label: 'Wastage Carton', value: 'Wastage Carton' },
  { label: 'Hardboard', value: 'Hardboard' },
  { label: 'Ply 3mm', value: 'Ply 3mm' },
  { label: 'Black Polythene Paper', value: 'Black Polythene Paper' },
  { label: 'Tarpoline', value: 'Tarpoline' },
  { label: 'Tin Sheet', value: 'Tin Sheet' },
  { label: 'Gift Items', value: 'Gift Items' },
];

const uomOptions = [
  { label: 'Kilogram (KG)', value: 'KG' },
  { label: 'Gram (G)', value: 'G' },
  { label: 'Piece (PC)', value: 'PC' },
];

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = btoa(`${username}:${password}`);
    return `Basic ${token}`;
  },
};

// SAP Proxy API call
const fetchSapData = async (token: string): Promise<SapData> => {
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  const basicAuth = BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD);
  
  const sapUrl = `https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/LoadedDetailsSet?$filter=tokenno eq '${token}'`;

  const response = await fetch(sapUrl, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "Authorization": basicAuth,
      "sap-client": SAP_CLIENT,
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch from SAP");
  }

  return response.json();
};

// TEG Auth API call
const fetchTegAuthToken = async (): Promise<string> => {
  const TEG_USERNAME = "WmsIntegrationOperator";
  const TEG_PASSWORD = "Operator@2025";
  
  const authUrl = "https://beta-api-admin.transporteg.com/api/0.1/fetch/master/token";
  const authPayload = {
    username: TEG_USERNAME,
    password: TEG_PASSWORD,
  };

  const response = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authPayload),
  });

  if (!response.ok) {
    throw new Error("Failed to authenticate with TEG");
  }

  const data = await response.json();
  const token = data.data?.token || data.authToken;

  if (!token) {
    throw new Error("No token received from TEG API");
  }

  return token;
};

// TEG Update API call
const sendTegUpdate = async (tegToken: string, payload: any): Promise<any> => {
  const updateUrl = "https://beta-apis-indenting.transporteg.com/indent/api/0.1/update/wms/picking/data";
  
  const response = await fetch(updateUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": tegToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to update TEG data");
  }

  return response.json();
};

// Additional Materials API call
const sendAdditionalMaterials = async (tegToken: string, payload: any): Promise<any> => {
  const url = "https://beta-apis-indenting.transporteg.com/indent/api/0.2/update/wms/additional/material";
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "token": tegToken,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to save additional materials");
  }

  return response.json();
};

// Custom Dropdown Button for the new modal
interface DropdownButtonProps {
    label: string;
    onPress: () => void;
}

const DropdownButton: React.FC<DropdownButtonProps> = ({ label, onPress }) => (
    <TouchableOpacity style={styles.dropdownHeader} onPress={onPress}>
        <Text style={label === 'Select Material' || label === 'Select UOM' ? styles.dropdownPlaceholder : styles.dropdownText}>{label}</Text>
        <ChevronDown size={20} color="#666" />
    </TouchableOpacity>
);

// New Modal for Material and UOM Selection
interface SelectModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (value: string) => void;
    options: { label: string; value: string }[];
    title: string;
}

const SelectModal: React.FC<SelectModalProps> = ({ visible, onClose, onSelect, options, title }) => (
    <Modal
        visible={visible}
        animationType="fade"
        transparent={true}
        onRequestClose={onClose}
    >
        <View style={styles.selectModalOverlay}>
            <View style={styles.selectModalContainer}>
                <View style={styles.selectModalHeader}>
                    <Text style={styles.selectModalTitle}>{title}</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X size={24} color="#000" />
                    </TouchableOpacity>
                </View>
                <ScrollView style={styles.selectModalScroll}>
                    {options.map((option, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.selectModalOption}
                            onPress={() => onSelect(option.value)}
                        >
                            <Text style={styles.selectModalOptionText}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        </View>
    </Modal>
);

// Main App Component
const Gross: React.FC<GrossProps> = ({ onStartNew, initialVepToken }) => {
  const [vepToken, setVepToken] = useState<string>(initialVepToken || '');
  const [loadingSequence, setLoadingSequence] = useState<SapDataItem[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'initial' | 'data-loaded' | 'completed'>('initial');
  const [showAdditionalMaterialPopup, setShowAdditionalMaterialPopup] = useState<boolean>(false);
  const [showMaterialSelectModal, setShowMaterialSelectModal] = useState<boolean>(false);
  const [showUOMSelectModal, setShowUOMSelectModal] = useState<boolean>(false);
  const [currentMaterialIndex, setCurrentMaterialIndex] = useState<number>(0);
  const [additionalMaterials, setAdditionalMaterials] = useState<AdditionalMaterial[]>([
    { materialId: '', quantity: '', uom: 'KG' }
  ]);
  const [lastUpdateAttempt, setLastUpdateAttempt] = useState<{ 
    isCompleted: boolean; 
    materials: AdditionalMaterial[] | null 
  } | null>(null);
  const [updateRetryCount, setUpdateRetryCount] = useState<number>(0);
  const [hasAttemptedUpdate, setHasAttemptedUpdate] = useState<boolean>(false);

  const totalBrgew = useMemo(() => {
    if (!loadingSequence) return 0;
    return loadingSequence.reduce((sum, item) => sum + parseFloat(item.brgew || '0'), 0);
  }, [loadingSequence]);

  const handleFetchData = useCallback(async (token: string) => {
    if (!token) {
      setError('VEP Token is required.');
      return;
    }
    setIsLoading(true);
    setError(null);
    setLoadingSequence(null);

    try {
      const data = await fetchSapData(token);
      const results = data.d.results;

      if (results.length === 0) {
        setError('No data found for the provided VEP Token.');
        setStep('initial');
        return;
      }

      const isValid = results.every(item => item.lfimg === item.prqty);
      if (!isValid) {
        setError('OBD QTY and LOADED QTY fields do not match for all items.');
        setLoadingSequence(results);
        setStep('data-loaded');
      } else {
        setLoadingSequence(results);
        setStep('data-loaded');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setStep('initial');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialVepToken) {
      handleFetchData(initialVepToken);
    }
  }, [initialVepToken, handleFetchData]);

  const processTegUpdate = async (isCompleted: boolean, materials: AdditionalMaterial[] | null = null) => {
    setIsLoading(true);
    setError(null);
    setLastUpdateAttempt({ isCompleted, materials });
    setHasAttemptedUpdate(true);

    try {
      const tegToken = await fetchTegAuthToken();
      if (!tegToken) throw new Error('TEG Authentication token not received.');

      const tegUpdatePayload = {
        token: vepToken,
        isLoadingCompleted: isCompleted,
        loadingDetails: loadingSequence?.map(item => ({
          doNumber: item.obd_no,
          quantity: item.prqty,
          batchNo: item.charg,
          batchLineNo: item.posnr || '900005',
          storageLocation: item.lgort,
          batchQuantity: item.lfimg,
          loadedQuantity: item.lfimg,
          materialCode: item.matnr,
          actualWeight: item.ntgew || '1183.096',
          lineItem: !item.uecha || item.uecha === '000000' ? '000010' : item.uecha,
          chargedWeight: item.brgew || '2127.870',
        })),
      };

      await sendTegUpdate(tegToken, tegUpdatePayload);

      if (materials && materials.length > 0 && materials[0].materialId) {
        const additionalMaterialsPayload = {
          token: vepToken,
          isLoadingCompleted: true,
          additionalMaterials: materials.map(row => ({
            materialDescription: row.materialId,
            chargedWeight: row.quantity,
            uom: row.uom,
          })),
        };
        await sendAdditionalMaterials(tegToken, additionalMaterialsPayload);
      }

      setStep('completed');
      setUpdateRetryCount(0);
    } catch (err) {
      const errorMessage = updateRetryCount >= 2 
        ? "Update failed. Try again after sometime!!" 
        : (err instanceof Error ? err.message : 'An unknown error occurred during the update process.');
      
      setError(errorMessage);
      setUpdateRetryCount(prev => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryUpdate = () => {
    if (lastUpdateAttempt) {
      processTegUpdate(lastUpdateAttempt.isCompleted, lastUpdateAttempt.materials);
    }
  };

  const handleAddAdditionalMaterial = () => {
    const hasValidMaterial = additionalMaterials.some(
      mat => mat.materialId && mat.quantity
    );
    
    if (!hasValidMaterial) {
      setError("Please select at least one material and enter quantity");
      return;
    }
    
    processTegUpdate(false, additionalMaterials);
    setShowAdditionalMaterialPopup(false);
  };

  const handleAdditionalMaterialChange = (index: number, field: keyof AdditionalMaterial, value: string) => {
    const newMaterials = [...additionalMaterials];
    newMaterials[index][field] = value;
    setAdditionalMaterials(newMaterials);
  };

  const addAdditionalMaterialRow = () => {
    setAdditionalMaterials([...additionalMaterials, { materialId: '', quantity: '', uom: 'KG' }]);
  };

  const removeAdditionalMaterialRow = (index: number) => {
    if (additionalMaterials.length > 1) {
      const newMaterials = [...additionalMaterials];
      newMaterials.splice(index, 1);
      setAdditionalMaterials(newMaterials);
    }
  };

  const handleStartNew = () => {
    setVepToken('');
    setLoadingSequence(null);
    setIsLoading(false);
    setError(null);
    setStep('initial');
    setAdditionalMaterials([{ materialId: '', quantity: '', uom: 'KG' }]);
    setLastUpdateAttempt(null);
    setUpdateRetryCount(0);
    setHasAttemptedUpdate(false);
    onStartNew();
  };

  const onMaterialSelect = (value: string) => {
    handleAdditionalMaterialChange(currentMaterialIndex, 'materialId', value);
    setShowMaterialSelectModal(false);
  };

  const onUOMSelect = (value: string) => {
      handleAdditionalMaterialChange(currentMaterialIndex, 'uom', value);
      setShowUOMSelectModal(false);
  };

  const renderInitialStep = () => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Gross Weight Check</Text>
      <Text style={styles.cardDescription}>Enter VEP Token to fetch SAP data</Text>
      
      <View style={styles.inputContainer}>
        <Text style={styles.label}>VEP Token:</Text>
        <TextInput
          style={styles.input}
          value={vepToken}
          onChangeText={setVepToken}
          placeholder="Enter VEP Token"
          editable={!isLoading}
        />
      </View>
      
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007bff" />
          <Text style={styles.loadingText}>Loading data...</Text>
        </View>
      )}
      
      {error && (
        <View style={styles.errorContainer}>
          <AlertTriangle size={20} color="#dc2626" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorDescription}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => handleFetchData(vepToken)}>
            <RefreshCcw size={16} color="#000" />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {!isLoading && (
        <TouchableOpacity 
          style={[styles.button, !vepToken ? styles.disabledButton : null]} 
          onPress={() => handleFetchData(vepToken)}
          disabled={!vepToken}
        >
          <Text style={styles.buttonText}>Fetch Data</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderDataLoadedStep = () => (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>SAP Data for VEP Token: {vepToken}</Text>
        <Text style={styles.cardDescription}>Review the data below. OBD Qty and Loaded Qty must match to proceed without errors.</Text>
        
        {error && (
          <View style={styles.errorContainer}>
            <AlertTriangle size={20} color="#dc2626" />
            <Text style={styles.errorTitle}>{hasAttemptedUpdate ? "Update Failed" : "Validation Failed"}</Text>
            <Text style={styles.errorDescription}>{error}</Text>
          </View>
        )}
        
        <View style={styles.totalWeightContainer}>
          <Text style={styles.totalWeightLabel}>Total Gross Weight: </Text>
          <Text style={styles.totalWeightValue}>{totalBrgew.toFixed(2)} KG</Text>
        </View>
        
        {/* Table Container - now just a regular view */}
        <View style={styles.tableContainer}>
          {/* Horizontal ScrollView for wide content */}
          <ScrollView horizontal={true} contentContainerStyle={styles.tableContent}>
            <View>
              {/* Table Header - remains fixed at the top */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>OBD</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Material</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Posnr</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Actual Weight</Text>
                <Text style={[styles.tableHeaderCell, { width: 120 }]}>Gross Weight</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>OBD Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: 100 }]}>Loaded Qty</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Batch</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Location</Text>
                <Text style={[styles.tableHeaderCell, { width: 80 }]}>Item</Text>
              </View>
              
              {/* Table Rows - no longer a separate scrollable component */}
              {loadingSequence?.map((item, index) => (
                <View 
                  key={index} 
                  style={[
                    styles.tableRow,
                    item.lfimg !== item.prqty ? styles.errorRow : null
                  ]}
                >
                  <Text style={[styles.tableCell, { width: 100 }]}>{item.obd_no}</Text>
                  <Text style={[styles.tableCell, { width: 120 }]}>{item.matnr}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{item.posnr}</Text>
                  <Text style={[styles.tableCell, { width: 120 }]}>{item.ntgew}</Text>
                  <Text style={[styles.tableCell, { width: 120 }]}>{item.brgew}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{item.lfimg}</Text>
                  <Text style={[styles.tableCell, { width: 100 }]}>{item.prqty}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{item.charg}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{item.lgort}</Text>
                  <Text style={[styles.tableCell, { width: 80 }]}>{item.uecha}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
        
        <View style={styles.buttonContainer}>
          <TouchableOpacity 
            style={[styles.button, styles.outlineButton]}
            onPress={() => setShowAdditionalMaterialPopup(true)}
          >
            <Plus size={16} color="#007bff" />
            <Text style={[styles.buttonText, { color: '#007bff' }]}>Add Additional Material</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.button, isLoading ? styles.disabledButton : null]}
            disabled={isLoading}
            onPress={() => processTegUpdate(true)}
          >
            {isLoading && <ActivityIndicator size="small" color="#fff" />}
            <Text style={styles.buttonText}>Continue without Additional Material</Text>
          </TouchableOpacity>
          
          {hasAttemptedUpdate && (
            <TouchableOpacity 
              style={[styles.button, styles.outlineButton]}
              onPress={handleRetryUpdate}
              disabled={isLoading}
            >
              <RefreshCcw size={16} color="#000" />
              <Text style={[styles.retryButtonText, { color: '#000' }]}>Retry Update</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      <Modal
        visible={showAdditionalMaterialPopup}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAdditionalMaterialPopup(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Additional Material</Text>
                <TouchableOpacity 
                  onPress={() => setShowAdditionalMaterialPopup(false)}
                  style={styles.closeButton}
                >
                  <X size={24} color="#000" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.materialsScrollView}>
                {additionalMaterials.map((mat, index) => (
                  <View key={index} style={styles.materialRow}>
                    <View style={styles.materialInputContainer}>
                      <Text style={styles.label}>Material</Text>
                      <DropdownButton
                          label={materialOptions.find(opt => opt.value === mat.materialId)?.label || 'Select Material'}
                          onPress={() => {
                              setCurrentMaterialIndex(index);
                              setShowMaterialSelectModal(true);
                          }}
                      />
                    </View>
                    
                    <View style={styles.materialInputContainer}>
                      <Text style={styles.label}>Quantity</Text>
                      <TextInput
                        style={styles.input}
                        value={mat.quantity}
                        onChangeText={(value) => handleAdditionalMaterialChange(index, 'quantity', value)}
                        keyboardType="numeric"
                        placeholder="Enter quantity"
                      />
                    </View>
                    
                    <View style={styles.materialInputContainer}>
                      <Text style={styles.label}>UOM</Text>
                      <DropdownButton
                          label={uomOptions.find(opt => opt.value === mat.uom)?.label || 'Select UOM'}
                          onPress={() => {
                              setCurrentMaterialIndex(index);
                              setShowUOMSelectModal(true);
                          }}
                      />
                    </View>

                    {additionalMaterials.length > 1 && (
                      <TouchableOpacity 
                        style={styles.removeButton}
                        onPress={() => removeAdditionalMaterialRow(index)}
                      >
                        <X size={16} color="#dc2626" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
                
                <TouchableOpacity 
                  style={styles.addRowButton} 
                  onPress={addAdditionalMaterialRow}
                >
                  <Plus size={16} color="#007bff" />
                  <Text style={styles.addRowButtonText}>Add Another Material</Text>
                </TouchableOpacity>
              </ScrollView>
              
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={[styles.button, styles.outlineButton]}
                  onPress={() => setShowAdditionalMaterialPopup(false)}
                >
                  <Text style={[styles.buttonText, { color: '#000' }]}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.button, isLoading ? styles.disabledButton : null]}
                  onPress={handleAddAdditionalMaterial}
                  disabled={isLoading}
                >
                  {isLoading && <ActivityIndicator size="small" color="#fff" />}
                  <Text style={styles.buttonText}>Add and Complete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <SelectModal
          visible={showMaterialSelectModal}
          onClose={() => setShowMaterialSelectModal(false)}
          onSelect={onMaterialSelect}
          options={materialOptions}
          title="Select Material"
      />
      <SelectModal
          visible={showUOMSelectModal}
          onClose={() => setShowUOMSelectModal(false)}
          onSelect={onUOMSelect}
          options={uomOptions}
          title="Select UOM"
      />
    </ScrollView>
  );

  const renderCompletedStep = () => (
    <View style={[styles.card, styles.completedCard]}>
      <CheckCircle size={64} color="#22c55e" style={styles.successIcon} />
      <Text style={styles.completedTitle}>Process Completed!</Text>
      <Text style={styles.completedDescription}>All updates have been sent successfully.</Text>
      
      <TouchableOpacity style={[styles.button, styles.outlineButton]} onPress={handleStartNew}>
        <Text style={[styles.buttonText, { color: '#007bff' }]}>Start New VEP Token</Text>
      </TouchableOpacity>
    </View>
  );

  switch (step) {
    case 'data-loaded':
      return renderDataLoadedStep();
    case 'completed':
      return renderCompletedStep();
    case 'initial':
    default:
      return renderInitialStep();
  }
};

const styles = StyleSheet.create({
  container: {
      flex: 1,
      backgroundColor: '#f3f4f6',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#1f2937',
  },
  cardDescription: {
    color: '#6b7280',
    marginBottom: 20,
    fontSize: 14,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    marginBottom: 6,
    fontWeight: '500',
    color: '#374151',
    fontSize: 14,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
    fontSize: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 20,
    marginVertical: 10,
  },
  loadingText: {
    marginTop: 10,
    color: '#6b7280',
  },
  errorContainer: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
    borderRadius: 6,
    padding: 16,
    marginBottom: 20,
  },
  errorTitle: {
    color: '#dc2626',
    fontWeight: 'bold',
    marginTop: 8,
    fontSize: 16,
  },
  errorDescription: {
    color: '#dc2626',
    marginVertical: 8,
    fontSize: 14,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    padding: 10,
    marginTop: 8,
  },
  retryButtonText: {
    marginLeft: 8,
    fontSize: 14,
  },
  totalWeightContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginBottom: 20,
    padding: 12,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
  },
  totalWeightLabel: {
    fontWeight: '600',
    fontSize: 16,
    color: '#374151',
  },
  totalWeightValue: {
    fontWeight: 'bold',
    fontSize: 18,
    color: '#16a34a',
    marginLeft: 8,
  },
  tableContainer: {
    // No maxHeight or flexGrow is needed here
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    fontWeight: 'bold',
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
    fontSize: 12,
    color: '#374151',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableCell: {
    padding: 12,
    borderRightWidth: 1,
    borderRightColor: '#e5e7eb',
    fontSize: 12,
    textAlign: 'center',
  },
  errorRow: {
    backgroundColor: '#fef2f2',
  },
  buttonContainer: {
    marginTop: 20,
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007bff',
    padding: 14,
    borderRadius: 8,
    gap: 8,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  disabledButton: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxHeight: '80%',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  closeButton: {
    padding: 4,
  },
  materialsScrollView: {
    padding: 20,
    maxHeight: 400,
  },
  materialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    position: 'relative',
    gap: 10,
  },
  removeButton: {
    padding: 4,
    marginTop: 24,
  },
  materialInputContainer: {
    flex: 1,
    marginBottom: 0,
  },
  addRowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
    gap: 8,
  },
  addRowButtonText: {
    color: '#007bff',
    fontWeight: '500',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  completedCard: {
    alignItems: 'center',
    padding: 32,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 8,
    textAlign: 'center',
  },
  completedDescription: {
    color: '#6b7280',
    marginBottom: 24,
    textAlign: 'center',
  },
  successIcon: {
    marginBottom: 16,
  },
  // New Modal Styles
  selectModalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.3)',
      justifyContent: 'center',
      alignItems: 'center',
  },
  selectModalContainer: {
      width: '80%',
      backgroundColor: '#fff',
      borderRadius: 12,
      overflow: 'hidden',
  },
  selectModalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
  },
  selectModalTitle: {
      fontSize: 16,
      fontWeight: 'bold',
      color: '#1f2937',
  },
  selectModalScroll: {
      maxHeight: 300,
  },
  selectModalOption: {
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
  },
  selectModalOptionText: {
      fontSize: 16,
      color: '#1f2937',
  },
  // Dropdown Button styles
  dropdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#fff',
  },
  dropdownText: {
    fontSize: 16,
    color: '#1f2937',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

export default Gross;