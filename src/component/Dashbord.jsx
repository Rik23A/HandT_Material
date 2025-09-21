//it properly functionable code dashboard.jsx 

import React, { useState, useEffect } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
  KeyboardAvoidingView,
  Modal,
  ActivityIndicator,
} from 'react-native';

// Reusable input field component
const LabeledInput = ({
  label,
  value,
  onChangeText,
  editable = false,
  keyboardType = 'default',
  isError = false,
  isFocused = false,
  onFocus,
  onBlur,
  style,
  selectOptions,
  onSelect,
}) => {
  const [isPickerVisible, setIsPickerVisible] = useState(false);

  const renderInput = () => {
    if (selectOptions) {
      return (
        <TouchableOpacity
          style={[
            styles.input,
            styles.inputDisabled,
            isError && styles.inputError, 
            isFocused && styles.inputFocused,
            style,
          ]}
          onPress={() => setIsPickerVisible(true)}
          disabled={!editable}
        >
          <Text style={{ color: value ? '#343a40' : '#6c757d' }}>
            {value || `Select ${label.replace(':', '')}`}
          </Text>
        </TouchableOpacity>
      );
    }
    return (
      <TextInput
        style={[
          styles.input,
          !editable && styles.inputDisabled,
          isError && styles.inputError,
          isFocused && styles.inputFocused,
          style,
        ]}
        value={value}
        onChangeText={onChangeText}
        editable={editable}
        keyboardType={keyboardType}
        placeholder={editable ? `Enter ${label.replace(':', '')}` : ''}
        onFocus={onFocus}
        onBlur={onBlur}
      />
    );
  };

  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      {renderInput()}
      {selectOptions && (
        <Modal transparent={true} visible={isPickerVisible} onRequestClose={() => setIsPickerVisible(false)}>
          <TouchableOpacity style={modalStyles.centeredView} onPress={() => setIsPickerVisible(false)}>
            <View style={modalStyles.modalView}>
              <ScrollView>
                {selectOptions.map((option, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.selectOption}
                    onPress={() => {
                      onSelect(option);
                      setIsPickerVisible(false);
                    }}
                  >
                    <Text style={styles.selectOptionText}>{option}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={modalStyles.buttonOk} onPress={() => setIsPickerVisible(false)}>
                <Text style={modalStyles.buttonText}>Close</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

// --- Inherited Modal Styles ---
const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#1F2937',
  },
  modalMessage: {
    textAlign: 'center',
    color: '#4B5563',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  buttonCancel: {
    flex: 1,
    backgroundColor: '#868686ff',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginRight: 5,
  },
  buttonConfirm: {
    flex: 1,
    backgroundColor: '#DC2626',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonLoad: {
    flex: 1,
    backgroundColor: '#16A34A',
    borderRadius: 25,
    padding: 15,
    alignItems: 'center',
    marginLeft: 5,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  batchesList: {
    maxHeight: 250,
    width: '100%',
    marginBottom: 20,
  },
  batchItem: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  batchText: {
    fontSize: 14,
    color: '#4B5563',
  },
  batchTextBold: {
    fontWeight: 'bold',
  },
  batchActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  batchActionButton: {
    marginLeft: 10,
    backgroundColor: '#E5E7EB',
    padding: 8,
    borderRadius: 20,
  },
  footerButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  successEmoji: {
    fontSize: 40,
    marginBottom: 15,
  },
  errorEmoji: {
    fontSize: 40,
    marginBottom: 15,
    color: '#EF4444',
  },
  buttonOk: {
    width: '100%',
    borderRadius: 25,
    padding: 15,
    elevation: 2,
    backgroundColor: '#2563EB',
  },
  buttonError: {
    width: '100%',
    borderRadius: 25,
    padding: 15,
    elevation: 2,
    backgroundColor: '#DC2626',
  },
});

// Updated Success modal
const SuccessModal = ({ isVisible, onClose, message, data }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <Text style={modalStyles.successEmoji}>✅</Text>
        <Text style={modalStyles.modalTitle}>{message}</Text>
        {data && data.length > 0 && (
          <View style={modalStyles.batchesList}>
            <Text style={modalStyles.modalMessage}>Batch Details:</Text>
            <ScrollView>
              {data.map((b, i) => (
                <View key={i} style={modalStyles.batchItem}>
                  <Text style={modalStyles.batchText}>VEP Token: <Text style={modalStyles.batchTextBold}>{b.VEPToken}</Text></Text>
                  <Text style={modalStyles.batchText}>OBD: <Text style={modalStyles.batchTextBold}>{b.OBD_No}</Text></Text>
                  <Text style={modalStyles.batchText}>POSNR: <Text style={modalStyles.batchTextBold}>{b.POSNR}</Text></Text>
                  <Text style={modalStyles.batchText}>Material: <Text style={modalStyles.batchTextBold}>{b.MaterialNo}</Text></Text>
                  <Text style={modalStyles.batchText}>Batch: <Text style={modalStyles.batchTextBold}>{b.BatchNo}</Text></Text>
                  <Text style={modalStyles.batchText}>Qty: <Text style={modalStyles.batchTextBold}>{b.LoadedQty}</Text></Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}
        <TouchableOpacity style={modalStyles.buttonOk} onPress={onClose}>
          <Text style={modalStyles.buttonText}>OK</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

// Custom confirmation modal
const ConfirmModal = ({ isVisible, onClose, onConfirm, message }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <Text style={modalStyles.modalTitle}>Confirm Action</Text>
        <Text style={modalStyles.modalMessage}>{message}</Text>
        <View style={modalStyles.buttonContainer}>
          <TouchableOpacity style={modalStyles.buttonCancel} onPress={onClose}>
            <Text style={modalStyles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.buttonConfirm} onPress={onConfirm}>
            <Text style={modalStyles.buttonText}>Confirm</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Confirm Load Modal
const ConfirmLoadModal = ({ isVisible, onClose, onConfirm, batches }) => (
  <Modal
    animationType="slide"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <Text style={modalStyles.modalTitle}>Confirm Load</Text>
        <Text style={modalStyles.modalMessage}>Please review the batches to be loaded:</Text>
        <ScrollView style={modalStyles.batchesList}>
          {batches.map((b, i) => (
            <View key={i} style={modalStyles.batchItem}>
              <Text style={modalStyles.batchText}>VEP Token: <Text style={modalStyles.batchTextBold}>{b.VEPToken}</Text></Text>
              <Text style={modalStyles.batchText}>OBD: <Text style={modalStyles.batchTextBold}>{b.OBD_No}</Text></Text>
              <Text style={modalStyles.batchText}>POSNR: <Text style={modalStyles.batchTextBold}>{b.POSNR}</Text></Text>
              <Text style={modalStyles.batchText}>Material: <Text style={modalStyles.batchTextBold}>{b.MaterialNo}</Text></Text>
              <Text style={modalStyles.batchText}>Batch: <Text style={modalStyles.batchTextBold}>{b.BatchNo}</Text></Text>
              <Text style={modalStyles.batchText}>Qty: <Text style={modalStyles.batchTextBold}>{b.LoadedQty}</Text></Text>
            </View>
          ))}
        </ScrollView>
        <View style={modalStyles.buttonContainer}>
          <TouchableOpacity style={modalStyles.buttonCancel} onPress={onClose}>
            <Text style={modalStyles.buttonText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity style={modalStyles.buttonLoad} onPress={onConfirm}>
            <Text style={modalStyles.buttonText}>Confirm Load</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  </Modal>
);

// Custom Error Modal with a "Go Back" button
const ErrorModal = ({ isVisible, onClose, message, onBack }) => (
  <Modal
    animationType="fade"
    transparent={true}
    visible={isVisible}
    onRequestClose={onClose}
  >
    <View style={modalStyles.centeredView}>
      <View style={modalStyles.modalView}>
        <Text style={modalStyles.errorEmoji}>⚠️</Text>
        <Text style={modalStyles.modalTitle}>Error</Text>
        <Text style={modalStyles.modalMessage}>{message}</Text>
        <TouchableOpacity style={modalStyles.buttonError} onPress={onBack}>
          <Text style={modalStyles.buttonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Modal>
);

const Dashboard = ({ vepToken, onBack }) => {
  const [vepData, setVepData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isErrorModalVisible, setIsErrorModalVisible] = useState(false);

  const [selectedTokenIndex, setSelectedTokenIndex] = useState(0);
  const [selectedOBDIndex, setSelectedOBDIndex] = useState(0);
  const [batchesByOBD, setBatchesByOBD] = useState({});
  const [formsByOBD, setFormsByOBD] = useState({});
  const [isProposedBatchEditable, setIsProposedBatchEditable] = useState(false);
  const [editingBatchIndex, setEditingBatchIndex] = useState(null);
  const [isSuccessModalVisible, setIsSuccessModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState('');
  const [modalData, setModalData] = useState([]);
  const [isConfirmModalVisible, setIsConfirmModalVisible] = useState(false);
  const [confirmAction, setConfirmAction] = useState(() => () => { });
  const [confirmMessage, setConfirmMessage] = useState('');
  const [isConfirmLoadModalVisible, setIsConfirmLoadModalVisible] = useState(false);
  const [batchesToLoad, setBatchesToLoad] = useState([]);
  const [validationErrors, setValidationErrors] = useState({});
  const [focusedField, setFocusedField] = useState(null);
  const [availablePosnrs, setAvailablePosnrs] = useState([]);

  const DATA_API_URL = `http://edvs4app.emamiagrotech.com:8001/sap/opu/odata/SAP/ZWH_BATCH_UPDATE_SRV/TokenDetailsSet(tokenno='${vepToken}')?$expand=getloadingsequence`;
  const authHeaders = {
    'Authorization': 'Basic ' + btoa('VERTIF_01:EmamiWM@DevM2025'),
    'sap-client': '110',
    'Accept': 'application/json',
  };

  useEffect(() => {
    const fetchVepData = async () => {
      setLoading(true);
      setError(null);
      setIsErrorModalVisible(false);

      try {
        const response = await fetch(DATA_API_URL, { headers: authHeaders });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP error! Status: ${response.status}. Response: ${errorText}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const responseText = await response.text();
          throw new Error(`Expected JSON response, but received content type: ${contentType}. Response text: ${responseText}`);
        }

        const data = await response.json();
        const loadingSequenceResults = data?.d?.getloadingsequence?.results;

        if (!loadingSequenceResults || loadingSequenceResults.length === 0) {
          setError("Invalid VEP Token or no data found. Please try again.");
          setIsErrorModalVisible(true);
          setVepData([]);
          return;
        }

        const obdMap = new Map();
        loadingSequenceResults.forEach((material) => {
          const obdNo = material.obd_no;
          if (!obdMap.has(obdNo)) {
            obdMap.set(obdNo, []);
          }
          obdMap.get(obdNo).push({
            POSNR: material.posnr,
            MaterialNo: material.matnr,
            MaterialDescription: material.maktx,
            ProposedQty: material.lfimg,
            ProposedBatchNo: material.charg,
            UOM: material.meins,
            // New fields from the payload
            DocCata: material.pstyv, // Mapped from 'pstyv'
            Dock: material.docknum, // Mapped from 'docknum'
            Warehouse: material.lgnum, // Mapped from 'lgnum'
            Bin: material.lgpla, // Mapped from 'lgpla'
            SequenceNo: material.sequenceno, // Mapped from 'sequenceno'
            Storage: material.lgort, // Mapped from 'lgort'
            StorageType: material.lgtyp, // Mapped from 'lgtyp'
            ToNo: material.tanum, // Mapped from 'tanum'
            Uecha: material.uecha, // Mapped from 'uecha'
            Channel: material.vtweg, // Mapped from 'vtweg'
            BatchOld: material.oldcharg, // Mapped from 'oldcharg'
          });
        });

        const transformedData = [{
          VEPToken: data.d.tokenno,
          OBDs: Array.from(obdMap.entries()).map(([obd_no, materials]) => ({
            OBD_No: obd_no,
            materials: materials,
          }))
        }];

        setVepData(transformedData);
      } catch (e) {
        if (e instanceof Error) {
          console.error("Failed to fetch VEP data:", e.message);
          setError(`Failed to load data. Please check the network connection. Error: ${e.message}`);
        } else {
          console.error("An unknown error occurred:", e);
          setError("An unknown error occurred while fetching data.");
        }
        setIsErrorModalVisible(true);
      } finally {
        setLoading(false);
      }
    };

    if (vepToken) {
      fetchVepData();
    }
  }, [vepToken]);

  const currentToken = vepData[selectedTokenIndex];
  const currentOBD = currentToken?.OBDs[selectedOBDIndex];

  const currentBatches = batchesByOBD[currentOBD?.OBD_No] || [];

  const getNextAvailablePosnr = (obdMaterials, batches) => {
    const usedPosnrs = new Set(batches.map(b => b.POSNR));
    const nextAvailable = obdMaterials.find(m => !usedPosnrs.has(m.POSNR));
    return nextAvailable;
  };

  useEffect(() => {
    if (currentOBD) {
      const obdKey = currentOBD.OBD_No;
      const allPosnrs = currentOBD.materials.map(m => m.POSNR);
      const batchesForOBD = batchesByOBD[obdKey] || [];
      const usedPosnrs = new Set(batchesForOBD.map(b => b.POSNR));
      const filteredPosnrs = allPosnrs.filter(p => !usedPosnrs.has(p));
      setAvailablePosnrs(filteredPosnrs);

      const nextMaterial = getNextAvailablePosnr(currentOBD.materials, batchesForOBD) || {};

      const initialForm = {
        VEPToken: currentToken.VEPToken,
        OBD_No: obdKey,
        POSNR: nextMaterial?.POSNR || '',
        MaterialNo: nextMaterial?.MaterialNo || '',
        MaterialDescription: nextMaterial?.MaterialDescription || '',
        ProposedQty: nextMaterial?.ProposedQty || '',
        ProposedBatchNo: nextMaterial?.ProposedBatchNo || '',
        BatchNo: nextMaterial?.ProposedBatchNo || '',
        LoadedQty: '',
        DocCata: nextMaterial?.DocCata || '',
        Dock: nextMaterial?.Dock || '',
        Warehouse: nextMaterial?.Warehouse || '',
        Bin: nextMaterial?.Bin || '',
        SequenceNo: nextMaterial?.SequenceNo || '',
        Storage: nextMaterial?.Storage || '',
        StorageType: nextMaterial?.StorageType || '',
        ToNo: nextMaterial?.ToNo || '',
        UOM: nextMaterial?.UOM || '',
        Uecha: nextMaterial?.Uecha || '',
        Channel: nextMaterial?.Channel || '',
        BatchOld: nextMaterial?.BatchOld || '',
      };
      setFormsByOBD((prev) => ({ ...prev, [obdKey]: initialForm }));
      setIsProposedBatchEditable(false);
      setEditingBatchIndex(null);
      setValidationErrors({});
    }
  }, [selectedTokenIndex, selectedOBDIndex, vepData, batchesByOBD]);

  const currentForm = formsByOBD[currentOBD?.OBD_No] || {};

  const handleFormChange = (key, value) => {
    setFormsByOBD((prev) => ({
      ...prev,
      [currentOBD.OBD_No]: {
        ...prev[currentOBD.OBD_No],
        [key]: value,
      },
    }));
  };

  const saveBatch = () => {
    const errors = {};
    const proposedQty = parseFloat(currentForm.ProposedQty);
    const loadedQty = parseFloat(currentForm.LoadedQty);

    if (!currentForm.BatchNo?.trim()) {
      errors.BatchNo = true;
    }
    if (!currentForm.LoadedQty?.trim() || isNaN(loadedQty)) {
      errors.LoadedQty = true;
    }
    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      setModalMessage('Please fill out all required fields with valid data.');
      setModalData([]);
      setIsSuccessModalVisible(true);
      return;
    }

    // Check quantity tolerance
    const minAllowedQty = proposedQty * 0.80;
    const maxAllowedQty = proposedQty * 1;

    if (loadedQty < minAllowedQty || loadedQty > maxAllowedQty) {
      setModalMessage(`Loaded Quantity is not within tolerance. The allowed range is ${minAllowedQty.toFixed(2)} to ${maxAllowedQty.toFixed(2)}.`);
      setModalData([]);
      setIsSuccessModalVisible(true);
      return;
    }

    // Validation: Check if the batch number already exists for a different POSNR
    const existingBatchWithSameNumber = currentBatches.find(
      (batch, index) => batch.BatchNo === currentForm.BatchNo && batch.POSNR !== currentForm.POSNR && index !== editingBatchIndex
    );
    if (existingBatchWithSameNumber) {
      setModalMessage(`Batch No. '${currentForm.BatchNo}' is already assigned to POSNR '${existingBatchWithSameNumber.POSNR}'. A single batch cannot be used for different line items.`);
      setModalData([]);
      setIsSuccessModalVisible(true);
      return;
    }

    const newBatch = {
      VEPToken: currentForm.VEPToken,
      OBD_No: currentForm.OBD_No,
      POSNR: currentForm.POSNR,
      MaterialNo: currentForm.MaterialNo,
      MaterialDescription: currentForm.MaterialDescription,
      BatchNo: currentForm.BatchNo,
      LoadedQty: currentForm.LoadedQty,
      DocCata: currentForm.DocCata,
      Dock: currentForm.Dock,
      Warehouse: currentForm.Warehouse,
      Bin: currentForm.Bin,
      SequenceNo: currentForm.SequenceNo,
      Storage: currentForm.Storage,
      StorageType: currentForm.StorageType,
      ToNo: currentForm.ToNo,
      UOM: currentForm.UOM,
      Uecha: currentForm.Uecha,
      Channel: currentForm.Channel,
      BatchOld: currentForm.BatchOld,
    };
    const obdKey = currentForm.OBD_No;
    const updatedBatchesForOBD = [...(batchesByOBD[obdKey] || [])];
    if (editingBatchIndex !== null) {
      updatedBatchesForOBD[editingBatchIndex] = newBatch;
      setModalMessage('Batch Updated Successfully!');
    } else {
      updatedBatchesForOBD.unshift(newBatch);
      setModalMessage('Batch Added Successfully!');
    }

    setBatchesByOBD({ ...batchesByOBD, [obdKey]: updatedBatchesForOBD });

    // Find the next available POSNR
    const updatedUsedPosnrs = new Set([...updatedBatchesForOBD.map(b => b.POSNR)]);
    const nextMaterial = currentOBD.materials.find(m => !updatedUsedPosnrs.has(m.POSNR)) || {};

    setFormsByOBD((prev) => {
      const currentOBDForms = prev[currentOBD.OBD_No];
      const newFormState = {
        ...currentOBDForms,
        POSNR: nextMaterial.POSNR || '',
        MaterialNo: nextMaterial.MaterialNo || '',
        MaterialDescription: nextMaterial.MaterialDescription || '',
        ProposedQty: nextMaterial?.ProposedQty || '',
        ProposedBatchNo: nextMaterial?.ProposedBatchNo || '',
        BatchNo: '',
        LoadedQty: '',
        DocCata: nextMaterial?.DocCata || '',
        Dock: nextMaterial?.Dock || '',
        Warehouse: nextMaterial?.Warehouse || '',
        Bin: nextMaterial?.Bin || '',
        SequenceNo: nextMaterial?.SequenceNo || '',
        Storage: nextMaterial?.Storage || '',
        StorageType: nextMaterial?.StorageType || '',
        ToNo: nextMaterial?.ToNo || '',
        UOM: nextMaterial?.UOM || '',
        Uecha: nextMaterial?.Uecha || '',
        Channel: nextMaterial?.Channel || '',
        BatchOld: nextMaterial?.BatchOld || '',
      };
      return {
        ...prev,
        [currentOBD.OBD_No]: newFormState,
      };
    });

    setEditingBatchIndex(null);
    setValidationErrors({});

    setModalData([newBatch]);
    setIsSuccessModalVisible(true);
  };

  const showConfirmLoadModal = () => {
    const allBatches = [...Object.values(batchesByOBD).flat()];
    const hasPendingFields = currentForm.BatchNo?.trim() && currentForm.LoadedQty?.trim();
    if (hasPendingFields) {
      allBatches.push({
        VEPToken: currentForm.VEPToken,
        OBD_No: currentForm.OBD_No,
        POSNR: currentForm.POSNR,
        MaterialNo: currentForm.MaterialNo,
        MaterialDescription: currentForm.MaterialDescription,
        BatchNo: currentForm.BatchNo,
        LoadedQty: currentForm.LoadedQty,
        DocCata: currentForm.DocCata,
        Dock: currentForm.Dock,
        Warehouse: currentForm.Warehouse,
        Bin: currentForm.Bin,
        SequenceNo: currentForm.SequenceNo,
        Storage: currentForm.Storage,
        StorageType: currentForm.StorageType,
        ToNo: currentForm.ToNo,
        UOM: currentForm.UOM,
        Uecha: currentForm.Uecha,
        Channel: currentForm.Channel,
        BatchOld: currentForm.BatchOld,
      });
    }

    if (allBatches.length === 0) {
      setModalMessage('There are no batches to load.');
      setIsSuccessModalVisible(true);
      return;
    }
    setBatchesToLoad(allBatches);
    setIsConfirmLoadModalVisible(true);
  };

  const confirmLoad = () => {
    setIsConfirmLoadModalVisible(false);
    const payload = batchesToLoad;

    setBatchesByOBD({});
    const material900001 = currentOBD.materials.find((m) => m.POSNR === '900001') || {};
    setFormsByOBD((prev) => ({
      ...prev,
      [currentOBD.OBD_No]: {
        VEPToken: currentToken.VEPToken,
        OBD_No: currentOBD.OBD_No,
        POSNR: '900001',
        MaterialNo: material900001.MaterialNo,
        MaterialDescription: material900001.MaterialDescription,
        ProposedQty: material900001.ProposedQty,
        ProposedBatchNo: material900001.ProposedBatchNo,
        BatchNo: material900001.ProposedBatchNo,
        LoadedQty: '',
        DocCata: material900001.DocCata,
        Dock: material900001.Dock,
        Warehouse: material900001.Warehouse,
        Bin: material900001.Bin,
        SequenceNo: material900001.SequenceNo,
        Storage: material900001.Storage,
        StorageType: material900001.StorageType,
        ToNo: material900001.ToNo,
        UOM: material900001.UOM,
        Uecha: material900001.Uecha,
        Channel: material900001.Channel,
        BatchOld: material900001.BatchOld,
      }
    }))
    setEditingBatchIndex(null);
    setValidationErrors({});

    setModalMessage('Load Confirmed');
    setModalData([]);
    setIsSuccessModalVisible(true);
  };

  const deleteBatch = (indexToDelete) => {
    setConfirmMessage('Are you sure you want to delete this batch?');
    setConfirmAction(() => () => {
      const obdKey = currentOBD.OBD_No;
      const updatedBatchesForOBD = currentBatches.filter((_, index) => index !== indexToDelete);
      setBatchesByOBD({ ...batchesByOBD, [obdKey]: updatedBatchesForOBD });
      setIsConfirmModalVisible(false);
    });
    setIsConfirmModalVisible(true);
  };

  const deleteOBD = (indexToDelete) => {
    setConfirmMessage('Are you sure you want to delete this OBD? This action cannot be undone.');
    setConfirmAction(() => () => {
      const obdToDeleteKey = currentToken.OBDs[indexToDelete].OBD_No;
      const newBatchesByOBD = { ...batchesByOBD };
      delete newBatchesByOBD[obdToDeleteKey];
      setBatchesByOBD(newBatchesByOBD);

      const newFormsByOBD = { ...formsByOBD };
      delete newFormsByOBD[obdToDeleteKey];
      setFormsByOBD(newFormsByOBD);

      const newOBDs = currentToken.OBDs.filter((_, index) => index !== indexToDelete);
      if (newOBDs.length > 0) {
        currentToken.OBDs = newOBDs;
        setSelectedOBDIndex(0);
      } else {
        if (vepData.length > 0) {
          setSelectedTokenIndex(0);
          setSelectedOBDIndex(0);
        } else {
          setBatchesByOBD({});
          setFormsByOBD({});
        }
      }
      setIsConfirmModalVisible(false);
    });
    setIsConfirmModalVisible(true);
  };

  const editBatch = (indexToEdit) => {
    const batchToEdit = currentBatches[indexToEdit];
    setFormsByOBD((prev) => ({
      ...prev,
      [currentOBD.OBD_No]: {
        ...prev[currentOBD.OBD_No],
        POSNR: batchToEdit.POSNR,
        MaterialNo: batchToEdit.MaterialNo,
        MaterialDescription: batchToEdit.MaterialDescription,
        BatchNo: batchToEdit.BatchNo,
        LoadedQty: batchToEdit.LoadedQty,
        DocCata: batchToEdit.DocCata,
        Dock: batchToEdit.Dock,
        Warehouse: batchToEdit.Warehouse,
        Bin: batchToEdit.Bin,
        SequenceNo: batchToEdit.SequenceNo,
        Storage: batchToEdit.Storage,
        StorageType: batchToEdit.StorageType,
        ToNo: batchToEdit.ToNo,
        UOM: batchToEdit.UOM,
        Uecha: batchToEdit.Uecha,
        Channel: batchToEdit.Channel,
        BatchOld: batchToEdit.BatchOld,
      }
    }))
    setEditingBatchIndex(indexToEdit);
  };

  const handleProposedBatchChange = (text) => {
    handleFormChange('ProposedBatchNo', text);
    handleFormChange('BatchNo', text);
  };

  const handlePosnrSelect = (selectedPosnr) => {
    const selectedMaterial = currentOBD.materials.find(m => m.POSNR === selectedPosnr);
    if (selectedMaterial) {
      setFormsByOBD((prev) => ({
        ...prev,
        [currentOBD.OBD_No]: {
          ...prev[currentOBD.OBD_No],
          POSNR: selectedMaterial.POSNR,
          MaterialNo: selectedMaterial.MaterialNo,
          MaterialDescription: selectedMaterial.MaterialDescription,
          ProposedQty: selectedMaterial.ProposedQty,
          ProposedBatchNo: selectedMaterial.ProposedBatchNo,
          BatchNo: selectedMaterial.ProposedBatchNo,
        }
      }));
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
      {/* loading animaion circle */}
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Loading VEP data...</Text>
      </View>
    );
  }

  // This conditional check is moved up to ensure the custom modal is shown first
  if (isErrorModalVisible) {
    return (
      <ErrorModal
        isVisible={isErrorModalVisible}
        onClose={() => setIsErrorModalVisible(false)}
        message={error}
        onBack={onBack}
      />
    );
  }

  // The original check for no data is still needed for when data is successfully fetched but is empty
  if (!currentToken || !currentToken.OBDs || !currentOBD) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>No VEP data available. Please check your data source.</Text>
        {/* Back to Home Button add by me*/}
        <TouchableOpacity onPress={onBack} style={styles.backButton2}>
            <Text style={styles.backButtonText2}>Back To Home</Text>
          </TouchableOpacity>
      </View>
    );
  }

  const isRDM = currentOBD.OBD_No.includes('RDM');

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <View style={styles.container}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Non-WMS Loading</Text>
          <ScrollView style={styles.contentScrollView}>
            {/* VEP Token Selection */}
            <Text style={styles.label}>Select VEP Token:</Text>
            <ScrollView horizontal style={styles.selectionRowScroll}>
              {vepData.map((token, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.selectionPill, selectedTokenIndex === idx && styles.selectedPill]}
                  onPress={() => setSelectedTokenIndex(idx)}
                >
                  <Text style={[styles.selectionText, selectedTokenIndex === idx && styles.selectedText]}>
                    {token.VEPToken}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* OBD Selection */}
            <Text style={styles.label}>Select OBD No:</Text>
            <ScrollView horizontal style={styles.selectionRowScroll}>
              {currentToken.OBDs.map((obd, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.selectionPill, selectedOBDIndex === idx && styles.selectedPill]}
                  onPress={() => setSelectedOBDIndex(idx)}
                >
                  <Text style={[styles.selectionText, selectedOBDIndex === idx && styles.selectedText]}>
                    {obd.OBD_No}
                  </Text>
                  <TouchableOpacity onPress={(e) => { e.stopPropagation(); deleteOBD(idx); }} style={styles.deleteButton}>
                    <Text style={styles.deleteIcon}>❌</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Form Fields */}
            <LabeledInput label="VEP Token:" value={currentForm.VEPToken} />
            <LabeledInput label="OBD No:" value={currentForm.OBD_No} />

            <LabeledInput
              label="POSNR:"
              value={currentForm.POSNR}
              editable={currentOBD?.materials?.length > 1}
              selectOptions={availablePosnrs}
              onSelect={handlePosnrSelect}
            />

            <LabeledInput label="Material No:" value={currentForm.MaterialNo} />
            <LabeledInput label="Material Description:" value={currentForm.MaterialDescription} />
            <LabeledInput label="Doc. Cat.:" value={currentForm.DocCata} />
            <LabeledInput label="Dock No.:" value={currentForm.Dock} />
            <LabeledInput label="Warehouse:" value={currentForm.Warehouse} />
            <LabeledInput label="Storage:" value={currentForm.Storage} />
            <LabeledInput label="Storage Type:" value={currentForm.StorageType} />
            <LabeledInput label="Bin:" value={currentForm.Bin} />
            <LabeledInput label="Sequence No.:" value={currentForm.SequenceNo} />
            <LabeledInput label="To No.:" value={currentForm.ToNo} />
            <LabeledInput label="UOM:" value={currentForm.UOM} />
            <LabeledInput label="Channel:" value={currentForm.Channel} />
            <LabeledInput label="Uecha:" value={currentForm.Uecha} />
            <LabeledInput label="Old Batch No.:" value={currentForm.BatchOld} />


            <View style={styles.proposedBatchRow}>
              <LabeledInput
                label="Proposed Batch No:"
                value={currentForm.ProposedBatchNo}
                onChangeText={handleProposedBatchChange}
                editable={isProposedBatchEditable}
                onFocus={() => setFocusedField('proposedBatch')}
                onBlur={() => setFocusedField(null)}
                isFocused={focusedField === 'proposedBatch'}
                style={{ flexGrow: 1 }}
              />
              {!isProposedBatchEditable && (
                <TouchableOpacity onPress={() => setIsProposedBatchEditable(true)} style={styles.editButton}>
                  <Text style={styles.editIcon}>✏️</Text>
                </TouchableOpacity>
              )}
            </View>

            <LabeledInput label="Proposed Qty:" value={currentForm.ProposedQty} />

            <View style={styles.divider} />

            {/* Add Batch Fields */}
            <LabeledInput
              label="Batch No:"
              value={currentForm.BatchNo}
              onChangeText={(t) => {
                handleFormChange('BatchNo', t);
                setValidationErrors({ ...validationErrors, BatchNo: false });
              }}
              editable
              onFocus={() => setFocusedField('batchNo')}
              onBlur={() => setFocusedField(null)}
              isError={validationErrors.BatchNo}
              isFocused={focusedField === 'batchNo'}
            />
            <LabeledInput
              label="Loaded Qty:"
              value={currentForm.LoadedQty}
              onChangeText={(t) => {
                handleFormChange('LoadedQty', t);
                setValidationErrors({ ...validationErrors, LoadedQty: false });
              }}
              editable
              keyboardType="numeric"
              onFocus={() => setFocusedField('loadedQty')}
              onBlur={() => setFocusedField(null)}
              isError={validationErrors.LoadedQty}
              isFocused={focusedField === 'loadedQty'}
            />

            {/* Added Batches List */}
            {currentBatches.length > 0 && (
              <View style={styles.batchListContainer}>
                <Text style={styles.subhead}>Added Batches</Text>
                {currentBatches.map((b, i) => (
                  <View key={i} style={styles.batchPill}>
                    <View>
                      <Text style={styles.batchPillText}>VEP: <Text style={styles.bold}>{b.VEPToken}</Text></Text>
                      <Text style={styles.batchPillText}>OBD: <Text style={styles.bold}>{b.OBD_No}</Text></Text>
                      <Text style={styles.batchPillText}>POSNR: <Text style={styles.bold}>{b.POSNR}</Text></Text>
                      <Text style={styles.batchPillText}>Material: <Text style={styles.bold}>{b.MaterialNo}</Text></Text>
                      <Text style={styles.batchPillText}>Batch: <Text style={styles.bold}>{b.BatchNo}</Text></Text>
                      <Text style={styles.batchPillText}>Qty: <Text style={styles.bold}>{b.LoadedQty}</Text></Text>
                      <Text style={styles.batchPillText}>Doc. Cat.: <Text style={styles.bold}>{b.DocCata}</Text></Text>
                      <Text style={styles.batchPillText}>Dock No.: <Text style={styles.bold}>{b.Dock}</Text></Text>
                      <Text style={styles.batchPillText}>Warehouse: <Text style={styles.bold}>{b.Warehouse}</Text></Text>
                      <Text style={styles.batchPillText}>Storage: <Text style={styles.bold}>{b.Storage}</Text></Text>
                      <Text style={styles.batchPillText}>Storage Type: <Text style={styles.bold}>{b.StorageType}</Text></Text>
                      <Text style={styles.batchPillText}>Bin: <Text style={styles.bold}>{b.Bin}</Text></Text>
                      <Text style={styles.batchPillText}>Sequence No.: <Text style={styles.bold}>{b.SequenceNo}</Text></Text>
                      <Text style={styles.batchPillText}>To No.: <Text style={styles.bold}>{b.ToNo}</Text></Text>
                      <Text style={styles.batchPillText}>UOM: <Text style={styles.bold}>{b.UOM}</Text></Text>
                      <Text style={styles.batchPillText}>Channel: <Text style={styles.bold}>{b.Channel}</Text></Text>
                      <Text style={styles.batchPillText}>Uecha: <Text style={styles.bold}>{b.Uecha}</Text></Text>
                      <Text style={styles.batchPillText}>Old Batch No.: <Text style={styles.bold}>{b.BatchOld}</Text></Text>
                    </View>
                    <View style={styles.batchActions}>
                      <TouchableOpacity onPress={() => editBatch(i)} style={styles.actionButton}>
                        <Text style={styles.actionIcon}>✏️</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteBatch(i)} style={styles.actionButton}>
                        <Text style={styles.actionIcon}>🗑️</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <TouchableOpacity style={[styles.button, styles.secondaryBtn]} onPress={saveBatch}>
              <Text style={styles.buttonText}>{editingBatchIndex !== null ? 'Update Batch' : 'Add Batch'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryBtn]}
              onPress={showConfirmLoadModal}
            >
              <Text style={styles.buttonText}>Confirm Load</Text>
            </TouchableOpacity>
          </View>

          <SuccessModal
            isVisible={isSuccessModalVisible}
            onClose={() => setIsSuccessModalVisible(false)}
            message={modalMessage}
            data={modalData}
          />
          <ConfirmModal
            isVisible={isConfirmModalVisible}
            onClose={() => setIsConfirmModalVisible(false)}
            onConfirm={confirmAction}
            message={confirmMessage}
          />
          <ConfirmLoadModal
            isVisible={isConfirmLoadModalVisible}
            onClose={() => setIsConfirmLoadModalVisible(false)}
            onConfirm={confirmLoad}
            batches={batchesToLoad}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#efefefff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 10,
    padding: 5,
    borderRadius: 5,
    borderColor: '#007bff',
    borderWidth: 1,
  },
  backButtonText: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  backButton2: {
    alignSelf: 'center',
    padding: 5,
    borderRadius: 5,
    borderColor: '#007bff',
    borderWidth: 1,
  },
  backButtonText2: {
    fontSize: 16,
    color: '#007bff',
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a237e',
    textAlign: 'center'
  },
  contentScrollView: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    color: '#343a40',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#ffffff',
    color: '#343a40',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#ced4da',
  },
  inputDisabled: {
    backgroundColor: '#e9ecef',
    color: '#6c757d',
  },
  inputError: {
    borderColor: '#dc3545',
  },
  inputFocused: {
    borderColor: '#007bff',
    shadowColor: '#007bff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  proposedBatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  editButton: {
    backgroundColor: '#fff',
    borderColor: '#007bff',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  editIcon: {
    color: '#0d00ffff',
    fontSize: 18,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginVertical: 15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  primaryBtn: {
    backgroundColor: '#007bff',
    marginLeft: 10,
  },
  secondaryBtn: {
    backgroundColor: '#6c757d',
    marginRight: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#343a40',
  },
  goBackButton: {
    marginTop: 15,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#6c757d',
  },
  goBackButtonText: {
    color: '#6c757d',
  },
  selectionRowScroll: {
    marginBottom: 15,
  },
  selectionPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e9ecef',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    marginRight: 10,
  },
  selectedPill: {
    backgroundColor: '#007bff',
  },
  selectionText: {
    color: '#343a40',
  },
  selectedText: {
    color: '#ffffffff',
  },
  deleteButton: {
    marginLeft: 10,
  },
  deleteIcon: {
    fontSize: 16,
  },
  batchListContainer: {
    marginTop: 20,
  },
  subhead: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a237e',
  },
  batchPill: {
    backgroundColor: '#f3f3f3ff',
    borderWidth: 1,
    borderColor: '#6ab1fdff',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderLeftWidth: 4,
    borderLeftColor: '#3B82F6',
  },
  bold: {
    fontWeight: 'bold',
  },
  batchPillText: {
    fontSize: 14,
    marginBottom: 2,
    color: '#4454ffff',
  },
  batchActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    padding: 5,
  },
  actionIcon: {
    fontSize: 20,
  },
  selectOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
    width: '100%',
  },
  selectOptionText: {
    fontSize: 16,
    color: '#333',
  },
});
export default Dashboard;