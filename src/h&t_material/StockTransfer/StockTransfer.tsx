/*
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
const StorageTypes = ["EDO", "RVP", "SCK"] as const;
const DestSlocs = ["ZF05", "ZF04", "ZF03", "ZF02", "ZF01"] as const;

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
  storageType: typeof StorageTypes[number];
  destSloc: typeof DestSlocs[number];
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
  stackValue?: string;
  STACKVAL?: string;
  TINDT?: string; // TINDT - format dd.mm.yyyy
  TINZE?: string; // TINZE - format HH:mm:ss
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
  // New fields for truck loading
  
}

interface StockTransferProps {
  odbGroups: ODBGroup[];
  onTransferComplete: (groups: ODBGroup[]) => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    const token = btoa(`${username}:${password}`);
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

// Define SAP response types
interface SapResponse {
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: {
    items?: ODBItem[];
    pickingPayload?: any;
    sapResponse?: any;
  };
}

// Helper function to extract cookies from response headers
const extractCookiesFromHeaders = (headers: any): string => {
  const cookies: string[] = [];
  
  // Check for set-cookie header (could be array or single value)
  const setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'];
  
  if (Array.isArray(setCookieHeader)) {
    setCookieHeader.forEach(cookie => {
      const cookieValue = cookie.split(';')[0];
      cookies.push(cookieValue);
    });
  } else if (setCookieHeader) {
    const cookieValue = setCookieHeader.split(';')[0];
    cookies.push(cookieValue);
  }
  
  return cookies.join('; ');
};

// Stock Transfer API call - Fixed for React Native
const sendStockTransfer = async (requestBody: any): Promise<SapResponse> => {
  const SAP_URL = 'https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/sap/ZSTOCK_MOVE_SRV/StockHeadSet';
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  
  try {
    // Step 1: Fetch CSRF token from SAP
    const headResponse = await fetch(SAP_URL, {
      method: 'HEAD',
      headers: {
        'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
        'x-csrf-token': 'fetch',
        'accept': 'application/json',
        'sap-client': SAP_CLIENT,
      },
    });

    if (!headResponse.ok) {
      const errorDetails = await headResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${errorDetails}`);
    }

    const csrfToken = headResponse.headers.get('x-csrf-token');
    const cookies = extractCookiesFromHeaders(headResponse.headers);

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Prepare the payload for the SAP OData service
    const { doNo, items, TINDT, TINZE } = requestBody;
    const payload = {
      Dono: doNo,
      
      OrderToItem: items.map((item: any) => ({
        Posnr: item.posnr,
        Matnr: item.material,
        Batch: item.actualBatch,
        Quantity: item.actualQuantity?.toString(),
        Uom: item.uom,
        StorageType: item.storageType,
        Storage: item.storage,
        ToStorage: item.destSloc,
        VepToken: item.vepToken || '',
        DocCata: item.docCata || '',
        UECHA: item.uecha || '',
        STACKVAL: item.STACKVAL || '',
        TINDT: TINDT, // Add truck loading date
      TINZE: TINZE, // Add truck loading time
      })),
    };

    // Step 2: Make the actual POST request with the obtained token
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
      'x-csrf-token': csrfToken,
      'sap-client': SAP_CLIENT,
      'accept': 'application/json',
    };

    // Add cookies if available
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const stockMoveResponse = await fetch(SAP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await stockMoveResponse.text();

    if (!stockMoveResponse.ok) {
      let errorMessage = `SAP stock transfer failed with HTTP status: ${stockMoveResponse.status}`;
      try {
        const errorResult = JSON.parse(responseText);
        errorMessage = errorResult.error?.message?.value || errorMessage;
      } catch (parseError) {
        const xmlMatch = responseText.match(/<message[^>]*>([^<]+)<\/message>/);
        if (xmlMatch && xmlMatch[1]) {
          errorMessage = xmlMatch[1];
        }
      }
      throw new Error(errorMessage);
    }

    // Parse the response with proper typing
    const result: any = JSON.parse(responseText);
    
    const firstItem = result.d?.OrderToItem?.results[0];
    const rawMessage = firstItem?.Message;
    
    if (rawMessage?.includes("Transfer posting Completed")) {
      const pickingPayload = {
        tokenno: firstItem.VepToken,
        getloadingsequence: {
          results: result.d?.OrderToItem?.results.map((sapItem: any) => ({
            tokenno: sapItem.VepToken,
            obd_no: result.d.Dono,
            posnr: sapItem.Posnr,
            matnr: sapItem.Matnr,
            charg: sapItem.Batch,
            sequenceno: sapItem.Sequenceno || '01',
            maktx: sapItem.Matnr || '',
            pstyv: sapItem.DocCata,
            speLoekz: false,
            werks: 'M251',
            lgort: sapItem.destSloc,
            lgnum: sapItem.Warehouse,
            lgtyp: sapItem.StorageType,
            docknum: '',
            lgpla: sapItem.Bin || '',
            lfimg: sapItem.Quantity,
            meins: sapItem.Uom,
            bolnr: '',
            tanum: '',
            oldcharg: sapItem.OldBatch,
            vtweg: '',
            uecha: sapItem.UECHA || ''
          }))
        }
      };
      
      return {
        status: 'success',
        message: rawMessage,
        data: {
          pickingPayload: pickingPayload,
          sapResponse: result
        }
      };
    } else if (rawMessage?.includes("Already Transfer posting Completed")) {
      return {
        status: 'warning',
        message: rawMessage,
        data: { items: items }
      };
    } else {
      return {
        status: 'error',
        message: rawMessage || "An unknown error occurred.",
        data: result
      };
    }
  } catch (error) {
    console.error('Error in stock transfer:', error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ClockIcon = () => <Text style={styles.icon}>⏰</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EditIcon = () => <Text style={styles.icon}>✏️</Text>;
const TrashIcon = () => <Text style={styles.icon}>🗑️</Text>;
const FileCheckIcon = () => <Text style={styles.icon}>📋</Text>;
const SaveIcon = () => <Text style={styles.icon}>💾</Text>;
const CopyIcon = () => <Text style={styles.icon}>📋</Text>;
const AlertIcon = () => <Text style={styles.icon}>⚠️</Text>;
const DropdownIcon = () => <Text style={styles.icon}>▼</Text>;
const CloseIcon = () => <Text style={styles.icon}>✕</Text>;
const CalendarIcon = () => <Text style={styles.icon}>📅</Text>;
const ClockOutlineIcon = () => <Text style={styles.icon}>🕒</Text>;

// Custom Dropdown Component with Modal
const CustomDropdown = ({
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity 
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <DropdownIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === item && styles.modalOptionSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Date Picker Component
const DatePicker = ({ value, onChange, placeholder = "Select date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const formatDate = (date) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  };
  
  const parseDate = (dateStr) => {
    if (!dateStr) return new Date();
    const [day, month, year] = dateStr.split('.').map(Number);
    return new Date(year, month - 1, day);
  };
  
  const handleConfirm = () => {
    onChange(formatDate(currentDate));
    setIsOpen(false);
  };
  
  const handleDayChange = (day) => {
    const newDate = new Date(currentDate);
    newDate.setDate(day);
    setCurrentDate(newDate);
  };
  
  const handleMonthChange = (month) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(month);
    setCurrentDate(newDate);
  };
  
  const handleYearChange = (year) => {
    const newDate = new Date(currentDate);
    newDate.setFullYear(year);
    setCurrentDate(newDate);
  };
  
  const renderCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDay = new Date(year, month, 1).getDay();
    
    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(i);
    }
    
    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={() => handleMonthChange(month - 1)}>
            <Text style={styles.calendarNav}>←</Text>
          </TouchableOpacity>
          <Text style={styles.calendarTitle}>
            {currentDate.toLocaleString('default', { month: 'long' })} {year}
          </Text>
          <TouchableOpacity onPress={() => handleMonthChange(month + 1)}>
            <Text style={styles.calendarNav}>→</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.calendarWeekdays}>
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
            <Text key={day} style={styles.calendarWeekday}>{day}</Text>
          ))}
        </View>
        
        <View style={styles.calendarDays}>
          {days.map((day, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.calendarDay,
                day === currentDate.getDate() && styles.calendarDaySelected
              ]}
              onPress={() => day && handleDayChange(day)}
              disabled={!day}
            >
              <Text style={[
                styles.calendarDayText,
                day === currentDate.getDate() && styles.calendarDayTextSelected
              ]}>
                {day || ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };
  
  return (
    <View style={styles.datePickerContainer}>
      <TouchableOpacity 
        style={styles.datePickerInput}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.datePickerValue : styles.datePickerPlaceholder}>
          {value || placeholder}
        </Text>
        <CalendarIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            
            {renderCalendar()}
            
            <View style={styles.datePickerActions}>
              <TouchableOpacity 
                style={styles.datePickerButton}
                onPress={() => setCurrentDate(new Date())}
              >
                <Text style={styles.datePickerButtonText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.datePickerButton, styles.datePickerButtonPrimary]}
                onPress={handleConfirm}
              >
                <Text style={styles.datePickerButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Time Picker Component
const TimePicker = ({ value, onChange, placeholder = "Select time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [hours, setHours] = useState('00');
  const [minutes, setMinutes] = useState('00');
  const [seconds, setSeconds] = useState('00');
  
  useEffect(() => {
    if (value) {
      const [h, m, s] = value.split(':');
      setHours(h || '00');
      setMinutes(m || '00');
      setSeconds(s || '00');
    }
  }, [value]);
  
  const handleConfirm = () => {
    onChange(`${hours}:${minutes}:${seconds}`);
    setIsOpen(false);
  };
  
  const renderNumberInput = (label, value, setValue, max) => (
    <View style={styles.timeInputGroup}>
      <Text style={styles.timeInputLabel}>{label}</Text>
      <TextInput
        style={styles.timeInput}
        value={value}
        onChangeText={(text) => {
          const num = parseInt(text) || 0;
          if (num >= 0 && num <= max) {
            setValue(num.toString().padStart(2, '0'));
          }
        }}
        keyboardType="numeric"
        maxLength={2}
      />
      <View style={styles.timeInputControls}>
        <TouchableOpacity 
          style={styles.timeInputButton}
          onPress={() => {
            const num = parseInt(value) + 1;
            if (num <= max) {
              setValue(num.toString().padStart(2, '0'));
            }
          }}
        >
          <Text style={styles.timeInputButtonText}>▲</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.timeInputButton}
          onPress={() => {
            const num = parseInt(value) - 1;
            if (num >= 0) {
              setValue(num.toString().padStart(2, '0'));
            }
          }}
        >
          <Text style={styles.timeInputButtonText}>▼</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
  
  return (
    <View style={styles.timePickerContainer}>
      <TouchableOpacity 
        style={styles.timePickerInput}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.timePickerValue : styles.timePickerPlaceholder}>
          {value || placeholder}
        </Text>
        <ClockOutlineIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            
            <View style={styles.timeInputsContainer}>
              {renderNumberInput('Hours', hours, setHours, 23)}
              <Text style={styles.timeSeparator}>:</Text>
              {renderNumberInput('Minutes', minutes, setMinutes, 59)}
              <Text style={styles.timeSeparator}>:</Text>
              {renderNumberInput('Seconds', seconds, setSeconds, 59)}
            </View>
            
            <View style={styles.timePickerActions}>
              <TouchableOpacity 
                style={[styles.timePickerButton, styles.timePickerButtonPrimary]}
                onPress={handleConfirm}
              >
                <Text style={styles.timePickerButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const ODBGroupCard = ({ 
  group, 
  onToggleEditMode, 
  onItemChange, 
  onDuplicateItem, 
  onDeleteItem, 
  onTransfer,
  onGroupFieldChange
}: { 
  group: ODBGroup; 
  onToggleEditMode: (doNo: string) => void; 
  onItemChange: (doNo: string, itemId: string, field: keyof ODBItem, value: any) => void; 
  onDuplicateItem: (doNo: string, itemId: string) => void; 
  onDeleteItem: (doNo: string, itemId: string) => void; 
  onTransfer: (group: ODBGroup) => void;
  onGroupFieldChange: (doNo: string, field: keyof ODBGroup, value: any) => void;
}) => {
  const { doNo, items, status, isEditing, TINDT, TINZE } = group;
  
  const statusMap: Record<typeof status, { color: string; icon: React.ReactNode }> = {
    pending: { color: "#6b7280", icon: <ClockIcon /> },
    loading: { color: "#f59e0b", icon: <ActivityIndicator size="small" color="#f59e0b" /> },
    completed: { color: "#10b981", icon: <CheckIcon /> },
    error: { color: "#ef4444", icon: <ErrorIcon /> },
    transferred: { color: "#3b82f6", icon: <CheckIcon /> },
    picked: { color: "#8b5cf6", icon: <CheckIcon /> },
  };

  const { materialTotals, validationStatus } = useMemo(() => {
    const totals: { [key: string]: { proposed: number; actual: number } } = {};
    let isValid = true;
    let message: string | null = null;

    // Step 1: aggregate totals
    items.forEach(item => {
      if (!totals[item.material]) {
        totals[item.material] = { proposed: 0, actual: 0 };
      }
      totals[item.material].proposed += item.qty;
      totals[item.material].actual += item.actualQuantity;
    });

    // Step 2: validation
    for (const material in totals) {
      const { proposed, actual } = totals[material];

      if (actual > 0) {
        // Rule 1: proposed must not be greater than actual
        if (proposed < actual) {
          isValid = false;
          message = `For material ${material}, proposed quantity (${proposed}) cannot be greater than actual available quantity (${actual}).`;
          break;
        }

        // Rule 2: shortage tolerance check (20%)
        const diffPercentage = ((proposed - actual) / proposed) * 100;
        if (diffPercentage > 20) {
          isValid = false;
          message = `For material ${material}, the proposed quantity exceeds the actual quantity by more than 20% tolerance.`;
          break;
        }
      }
    }

    // Step 3: return results
    return {
      materialTotals: totals,
      validationStatus: { isValid, message }
    };
  }, [items]);

  return (
    <View style={[styles.card, { borderColor: statusMap[status].color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {statusMap[status].icon}
          <Text style={styles.cardTitle}>Delivery Order: {doNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusMap[status].color }]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>
        
        <View style={styles.materialTotals}>
          {Object.entries(materialTotals).map(([material, totals]) => (
            <View key={material} style={styles.materialTotalItem}>
              <Text style={styles.materialText}>{material}:</Text>
              <Text style={styles.actualText}>{totals.actual}</Text>
              <Text style={styles.slashText}>/</Text>
              <Text style={styles.proposedText}>{totals.proposed}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.cardActions}>
          {status !== 'completed' && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onToggleEditMode(doNo)}
              >
                {isEditing ? <SaveIcon /> : <EditIcon />}
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity
                  style={[styles.transferButton, !validationStatus.isValid && styles.disabledButton]}
                  onPress={() => onTransfer(group)}
                  disabled={!validationStatus.isValid}
                >
                  <FileCheckIcon />
                  <Text style={styles.transferButtonText}>Complete Load</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      
      <View style={styles.cardContent}>
      
        {isEditing && (
          <View style={styles.truckLoadingFields}>
            <Text style={styles.fieldLabel}>Truck Loading Details</Text>
            <View style={styles.fieldRow}>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldSubLabel}>Start Date (TINDT)</Text>
                <DatePicker
                  value={TINDT}
                  onChange={(value) => onGroupFieldChange(doNo, 'TINDT', value)}
                  placeholder="dd.mm.yyyy"
                />
              </View>
              
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldSubLabel}>Start Time (TINZE)</Text>
                <TimePicker
                  value={TINZE}
                  onChange={(value) => onGroupFieldChange(doNo, 'TINZE', value)}
                  placeholder="HH:mm:ss"
                />
              </View>
            </View>
          </View>
        )}
        
        {isEditing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>VEP</Text>
                <Text style={styles.tableHeaderCell}>Item</Text>
                <Text style={styles.tableHeaderCell}>Posnr</Text>
                <Text style={styles.tableHeaderCell}>Material</Text>
                <Text style={styles.tableHeaderCell}>Proposed Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Batch</Text>
                <Text style={styles.tableHeaderCell}>Storage Type</Text>
                <Text style={styles.tableHeaderCell}>Proposed Sloc</Text>
                <Text style={styles.tableHeaderCell}>Dest. Sloc</Text>
                <Text style={styles.tableHeaderCell}>Actions</Text>
                <Text style={styles.tableHeaderCell}>Stack Value</Text>
              </View>
              
              {items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.vepToken}</Text>
                  <Text style={styles.tableCell}>{item.uecha}</Text>
                  <Text style={styles.tableCell}>{item.posnr}</Text>
                  
                  <View style={styles.tableCell}>
                    <Text style={styles.materialName}>{item.material}</Text>
                    <Text style={styles.materialDescription}>{item.materialDes}</Text>
                  </View>
                  
                  <Text style={styles.tableCell}>{item.qty} {item.uom}</Text>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualQuantity.toString()}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualQuantity", value)}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualBatch}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualBatch", value)}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.storageType}
                      options={StorageTypes.filter(st => st !== '')}
                      onSelect={(value) => onItemChange(doNo, item.id, "storageType", value)}
                      placeholder="Select Type"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <Text style={styles.tableCell}>{item.storage}</Text>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.destSloc}
                      options={DestSlocs}
                      onSelect={(value) => onItemChange(doNo, item.id, "destSloc", value)}
                      placeholder="Select SLOC"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDuplicateItem(doNo, item.id)}
                      >
                        <CopyIcon />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDeleteItem(doNo, item.id)}
                      >
                        <TrashIcon />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.STACKVAL || ""}
                      onChangeText={(value) => onItemChange(doNo, item.id, "STACKVAL", value)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemMaterial}>{item.material}</Text>
                <Text style={styles.itemDescription}>{item.materialDes}</Text>
                <Text>Qty: <Text style={styles.boldText}>{item.actualQuantity}</Text> 
                  <Text style={styles.mutedText}> ({item.qty})</Text>
                </Text>
                <Text>Batch: <Text style={styles.boldText}>{item.actualBatch}</Text> 
                  <Text style={styles.mutedText}> ({item.batch})</Text>
                </Text>
                <Text>Storage: <Text style={styles.boldText}>{item.storageType}</Text></Text>
                <Text>Dest: <Text style={styles.boldText}>{item.destSloc}</Text></Text>
              </View>
            ))}
          </View>
        )}
        
        {(isEditing && validationStatus.message) && (
          <View style={styles.errorAlert}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>Validation Error</Text>
              <Text style={styles.alertDescription}>{validationStatus.message}</Text>
            </View>
          </View>
        )}
        
        {!isEditing && group.validation.message && (
          <View style={[
            styles.alert,
            group.validation.status === 'success' ? styles.successAlert : 
            group.validation.status === 'warning' ? styles.warningAlert : 
            styles.errorAlert
          ]}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>{group.validation.status}</Text>
              <Text style={styles.alertDescription}>{group.validation.message}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const StockTransfer: React.FC<StockTransferProps> = ({ odbGroups, onTransferComplete }) => {
  const [groups, setGroups] = useState(odbGroups);
  const [error, setError] = useState<string | null>(null);
  const [isTransferComplete, setIsTransferComplete] = useState(false);

  const hasPendingTransfers = useMemo(() => {
    return groups.some(group => group.status === "pending" || group.isEditing);
  }, [groups]);

  const allGroupsAreTransferred = useMemo(() => {
    return groups.length > 0 && groups.every(group => group.status === "transferred" || group.status === "completed");
  }, [groups]);

  useEffect(() => {
    if (allGroupsAreTransferred) {
      setIsTransferComplete(true);
    }
  }, [allGroupsAreTransferred]);

  const handleTransfer = async (group: ODBGroup): Promise<void> => {
    setGroups((prev) =>
      prev.map((g) => (g.doNo === group.doNo ? { ...g, status: "loading" } : g))
    );

    try {
      const requestBody = {
        doNo: group.doNo,
        items: group.items.map((item) => ({
          material: item.material,
          originalQuantity: item.qty,
          actualQuantity: item.actualQuantity,
          originalBatch: item.batch,
          actualBatch: item.actualBatch,
          uom: item.uom,
          bin: item.bin,
          storage: item.storage,
          storageType: item.storageType,
          destSloc: item.destSloc,
          plant: item.plant,
          warehouse: item.warehouse,
          posnr: item.posnr,
          vepToken: item.vepToken,
          uecha: item.uecha,
          docCata: item.docCata || '',
          STACKVAL: item.STACKVAL || '',
          TINDT: item.TINDT,
        TINZE: item.TINZE,
        })),
      };

      const data = await sendStockTransfer(requestBody);

      let newStatus: ODBGroup["status"];

      if (data.status === "success") {
        newStatus = "transferred";
      } else if (data.status === "warning") {
        newStatus = "transferred";
      } else {
        newStatus = "error";
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: newStatus,
                isEditing: false,
                validation: { status: data.status, message: data.message },
                items: data.data?.items || g.items,
                pickingPayload: data.data?.pickingPayload,
                sapResponse: data.data?.sapResponse,
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Stock transfer failed due to an unexpected error.";
      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
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

  const handleTransferAll = async () => {
    const pendingGroups = groups.filter((g) => g.status === "pending" || g.isEditing);
    if (pendingGroups.length === 0) {
      setError("No pending ODBs to transfer.");
      return;
    }
    setError(null);
    await Promise.all(pendingGroups.map(group => handleTransfer(group)));
  };

  const handleItemChange = (doNo: string, itemId: string, field: keyof ODBItem, value: any) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const newItems = group.items.map((item) => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              if (field === "actualQuantity") {
                updatedItem.actualQuantity = Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value);
              }
              return updatedItem;
            }
            return item;
          });
          return { ...group, items: newItems };
        }
        return group;
      })
    );
  };

  const handleGroupFieldChange = (doNo: string, field: keyof ODBGroup, value: any) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          return { ...group, [field]: value };
        }
        return group;
      })
    );
  };

  const handleDuplicateItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const itemToDuplicate = group.items.find((item) => item.id === itemId)
          if (!itemToDuplicate) return group
          const duplicatedItem: ODBItem = {
            ...itemToDuplicate,
            id: uuidv4(),
            isNew: true,
            qty: 0,
            actualQuantity: 0,
            actualBatch: ""
          }
          const itemIndex = group.items.findIndex((item) => item.id === itemId)
          const newItems = [...group.items]
          newItems.splice(itemIndex + 1, 0, duplicatedItem)
          return { ...group, items: newItems }
        }
        return group
      })
    )
  };

  const handleDeleteItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
          : group
      )
    )
  };

  const toggleEditMode = (doNo: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, isEditing: !group.isEditing, validation: { status: null, message: null } }
          : group
      )
    );
  };

  if (isTransferComplete) {
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Stock Transfer Complete!</Text>
        <Text style={styles.completeDescription}>All ODBs have been successfully transferred.</Text>
        <CheckIcon />
        <TouchableOpacity style={styles.completeButton} onPress={() => onTransferComplete(groups)}>
          <Text style={styles.completeButtonText}>Move to Picking</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loading & Stock Transfer</Text>
        <TouchableOpacity
          style={[styles.transferAllButton, !hasPendingTransfers && styles.disabledButton]}
          onPress={handleTransferAll}
          disabled={!hasPendingTransfers}
        >
          <Text style={styles.transferAllButtonText}>Transfer All Pending</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorAlert}>
          <ErrorIcon />
          <View>
            <Text style={styles.alertTitle}>Error</Text>
            <Text style={styles.alertDescription}>{error}</Text>
          </View>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {groups.map((group) => (
          <ODBGroupCard
            key={group.doNo}
            group={group}
            onToggleEditMode={toggleEditMode}
            onItemChange={handleItemChange}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onTransfer={handleTransfer}
            onGroupFieldChange={handleGroupFieldChange}
          />
        ))}
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
    color: '#2c3e50',
  },
  transferAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transferAllButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  materialTotals: {
    marginLeft: 16,
  },
  materialTotalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  materialText: {
    fontWeight: '500',
    fontSize: 12,
    color: '#7f8c8d',
  },
  actualText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 12,
  },
  slashText: {
    marginHorizontal: 2,
    fontSize: 12,
    color: '#7f8c8d',
  },
  proposedText: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f8c8d',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 16,
  },
  // New truck loading fields styles
  truckLoadingFields: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  fieldLabel: {
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#2c3e50',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 16,
  },
  fieldGroup: {
    flex: 1,
  },
  fieldSubLabel: {
    fontSize: 12,
    marginBottom: 4,
    color: '#7f8c8d',
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    width: 100,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tableCell: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  materialName: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#2c3e50',
  },
  materialDescription: {
    fontSize: 8,
    color: '#7f8c8d',
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    minWidth: 60,
    backgroundColor: '#f8f9fa',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemMaterial: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2c3e50',
  },
  itemDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  mutedText: {
    fontSize: 10,
    color: '#95a5a6',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  successAlert: {
    backgroundColor: '#d1f2eb',
    borderColor: '#27ae60',
  },
  warningAlert: {
    backgroundColor: '#fef9e7',
    borderColor: '#f39c12',
  },
  errorAlert: {
    backgroundColor: '#f9ebea',
    borderColor: '#e74c3c',
  },
  alertTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    fontSize: 16,
  },
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    width: '100%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8f9fa',
    minHeight: 32,
  },
  dropdownValue: {
    fontSize: 10,
    color: '#2c3e50',
  },
  dropdownPlaceholder: {
    fontSize: 10,
    color: '#95a5a6',
  },
  // Modal styles for dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2c3e50',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdown: {
    minWidth: 80,
  },
  // Date Picker styles
  datePickerContainer: {
    position: 'relative',
    width: '100%',
  },
  datePickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8f9fa',
    minHeight: 32,
  },
  datePickerValue: {
    fontSize: 12,
    color: '#2c3e50',
  },
  datePickerPlaceholder: {
    fontSize: 12,
    color: '#95a5a6',
  },
  calendar: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  calendarNav: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  calendarWeekdays: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarWeekday: {
    fontWeight: 'bold',
    fontSize: 12,
    color: '#7f8c8d',
    width: 30,
    textAlign: 'center',
  },
  calendarDays: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 2,
    borderRadius: 15,
  },
  calendarDaySelected: {
    backgroundColor: '#3498db',
  },
  calendarDayText: {
    fontSize: 12,
    color: '#2c3e50',
  },
  calendarDayTextSelected: {
    color: '#fff',
    fontWeight: 'bold',
  },
  datePickerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  datePickerButton: {
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#ecf0f1',
  },
  datePickerButtonPrimary: {
    backgroundColor: '#3498db',
  },
  datePickerButtonText: {
    color: '#2c3e50',
    fontWeight: '500',
  },
  // Time Picker styles
  timePickerContainer: {
    position: 'relative',
    width: '100%',
  },
  timePickerInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8f9fa',
    minHeight: 32,
  },
  timePickerValue: {
    fontSize: 12,
    color: '#2c3e50',
  },
  timePickerPlaceholder: {
    fontSize: 12,
    color: '#95a5a6',
  },
  timeInputsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
    gap: 8,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 4,
  },
  timeInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 8,
    width: 50,
    textAlign: 'center',
    backgroundColor: '#f8f9fa',
  },
  timeInputControls: {
    marginTop: 4,
  },
  timeInputButton: {
    padding: 4,
  },
  timeInputButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#3498db',
  },
  timeSeparator: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 20,
  },
  timePickerActions: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    alignItems: 'flex-end',
  },
  timePickerButton: {
    padding: 8,
    borderRadius: 4,
  },
  timePickerButtonPrimary: {
    backgroundColor: '#3498db',
  },
  timePickerButtonText: {
    color: '#fff',
    fontWeight: '500',
  },
});

export default StockTransfer;
*/

//error message add
/*
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
const StorageTypes = ["EDO", "RVP", "SCK", ""] as const;
const DestSlocs = ["ZF05", "ZF04", "ZF03", "ZF02", "ZF01"] as const;

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
  storageType: typeof StorageTypes[number];
  destSloc: typeof DestSlocs[number];
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
  stackValue?: string;
  STACKVAL?: string;
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
  transferError?: string;
}

interface StockTransferProps {
  odbGroups: ODBGroup[];
  onTransferComplete: (groups: ODBGroup[]) => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    const token = btoa(`${username}:${password}`);
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

// Define SAP response types
interface SapResponse {
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: {
    items?: ODBItem[];
    pickingPayload?: any;
    sapResponse?: any;
  };
}

// Helper function to extract cookies from response headers
const extractCookiesFromHeaders = (headers: any): string => {
  const cookies: string[] = [];
  
  // Check for set-cookie header (could be array or single value)
  const setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'];
  
  if (Array.isArray(setCookieHeader)) {
    setCookieHeader.forEach(cookie => {
      const cookieValue = cookie.split(';')[0];
      cookies.push(cookieValue);
    });
  } else if (setCookieHeader) {
    const cookieValue = setCookieHeader.split(';')[0];
    cookies.push(cookieValue);
  }
  
  return cookies.join('; ');
};

// Stock Transfer API call - Fixed for React Native
const sendStockTransfer = async (requestBody: any): Promise<SapResponse> => {
  const SAP_URL = 'https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/sap/ZSTOCK_MOVE_SRV/StockHeadSet';
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  
  try {
    // Step 1: Fetch CSRF token from SAP
    const headResponse = await fetch(SAP_URL, {
      method: 'HEAD',
      headers: {
        'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
        'x-csrf-token': 'fetch',
        'accept': 'application/json',
        'sap-client': SAP_CLIENT,
      },
    });

    if (!headResponse.ok) {
      const errorDetails = await headResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${errorDetails}`);
    }

    const csrfToken = headResponse.headers.get('x-csrf-token');
    const cookies = extractCookiesFromHeaders(headResponse.headers);

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Prepare the payload for the SAP OData service
    const { doNo, items } = requestBody;
    const payload = {
      Dono: doNo,
      OrderToItem: items.map((item: any) => ({
        Posnr: item.posnr,
        Matnr: item.material,
        Batch: item.actualBatch,
        Quantity: item.actualQuantity?.toString(),
        Uom: item.uom,
        StorageType: item.storageType,
        Storage: item.storage,
        ToStorage: item.destSloc,
        VepToken: item.vepToken || '',
        DocCata: item.docCata || '',
        UECHA: item.uecha || '',
        STACKVAL: item.STACKVAL || ''
      })),
    };

    // Step 2: Make the actual POST request with the obtained token
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
      'x-csrf-token': csrfToken,
      'sap-client': SAP_CLIENT,
      'accept': 'application/json',
    };

    // Add cookies if available
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const stockMoveResponse = await fetch(SAP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await stockMoveResponse.text();

    if (!stockMoveResponse.ok) {
      let errorMessage = `SAP stock transfer failed with HTTP status: ${stockMoveResponse.status}`;
      try {
        const errorResult = JSON.parse(responseText);
        errorMessage = errorResult.error?.message?.value || errorMessage;
      } catch (parseError) {
        const xmlMatch = responseText.match(/<message[^>]*>([^<]+)<\/message>/);
        if (xmlMatch && xmlMatch[1]) {
          errorMessage = xmlMatch[1];
        }
      }
      throw new Error(errorMessage);
    }

    // Parse the response with proper typing
    const result: any = JSON.parse(responseText);
    
    const firstItem = result.d?.OrderToItem?.results[0];
    const rawMessage = firstItem?.Message;
    
    if (rawMessage?.includes("Transfer posting Completed")) {
      const pickingPayload = {
        tokenno: firstItem.VepToken,
        getloadingsequence: {
          results: result.d?.OrderToItem?.results.map((sapItem: any) => ({
            tokenno: sapItem.VepToken,
            obd_no: result.d.Dono,
            posnr: sapItem.Posnr,
            matnr: sapItem.Matnr,
            charg: sapItem.Batch,
            sequenceno: sapItem.Sequenceno || '01',
            maktx: sapItem.Matnr || '',
            pstyv: sapItem.DocCata,
            speLoekz: false,
            werks: 'M251',
            lgort: sapItem.destSloc,
            lgnum: sapItem.Warehouse,
            lgtyp: sapItem.StorageType,
            docknum: '',
            lgpla: sapItem.Bin || '',
            lfimg: sapItem.Quantity,
            meins: sapItem.Uom,
            bolnr: '',
            tanum: '',
            oldcharg: sapItem.OldBatch,
            vtweg: '',
            uecha: sapItem.UECHA || ''
          }))
        }
      };
      
      return {
        status: 'success',
        message: rawMessage,
        data: {
          pickingPayload: pickingPayload,
          sapResponse: result
        }
      };
    } else if (rawMessage?.includes("Already Transfer posting Completed")) {
      return {
        status: 'warning',
        message: rawMessage,
        data: { items: items }
      };
    } else {
      return {
        status: 'error',
        message: rawMessage || "An unknown error occurred.",
        data: result
      };
    }
  } catch (error) {
    console.error('Error in stock transfer:', error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ClockIcon = () => <Text style={styles.icon}>⏰</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EditIcon = () => <Text style={styles.icon}>✏️</Text>;
const TrashIcon = () => <Text style={styles.icon}>🗑️</Text>;
const FileCheckIcon = () => <Text style={styles.icon}>📋</Text>;
const SaveIcon = () => <Text style={styles.icon}>💾</Text>;
const CopyIcon = () => <Text style={styles.icon}>📋</Text>;
const AlertIcon = () => <Text style={styles.icon}>⚠️</Text>;
const DropdownIcon = () => <Text style={styles.icon}>▼</Text>;
const CloseIcon = () => <Text style={styles.icon}>✕</Text>;

// Custom Dropdown Component with Modal
const CustomDropdown = ({
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity 
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <DropdownIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === item && styles.modalOptionSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

interface ODBGroupCardProps {
  group: ODBGroup;
  onToggleEditMode: (doNo: string) => void;
  onItemChange: (doNo: string, itemId: string, field: keyof ODBItem, value: any) => void;
  onDuplicateItem: (doNo: string, itemId: string) => void;
  onDeleteItem: (doNo: string, itemId: string) => void;
  onTransfer: (group: ODBGroup) => void;
}

const ODBGroupCard = ({ 
  group, 
  onToggleEditMode, 
  onItemChange, 
  onDuplicateItem, 
  onDeleteItem, 
  onTransfer
}: ODBGroupCardProps) => {
  const { doNo, items, status, isEditing, transferError } = group;
  
  const statusMap: Record<typeof status, { color: string; icon: React.ReactNode }> = {
    pending: { color: "#6b7280", icon: <ClockIcon /> },
    loading: { color: "#f59e0b", icon: <ActivityIndicator size="small" color="#f59e0b" /> },
    completed: { color: "#10b981", icon: <CheckIcon /> },
    error: { color: "#ef4444", icon: <ErrorIcon /> },
    transferred: { color: "#3b82f6", icon: <CheckIcon /> },
    picked: { color: "#8b5cf6", icon: <CheckIcon /> },
  };

  const { materialTotals, validationStatus } = useMemo(() => {
    const totals: { [key: string]: { proposed: number; actual: number } } = {};
    let isValid = true;
    let message: string | null = null;

    // Step 1: aggregate totals
    items.forEach(item => {
      if (!totals[item.material]) {
        totals[item.material] = { proposed: 0, actual: 0 };
      }
      totals[item.material].proposed += item.qty;
      totals[item.material].actual += item.actualQuantity;
    });

    // Step 2: validation
    for (const material in totals) {
      const { proposed, actual } = totals[material];

      if (actual > 0) {
        // Rule 1: proposed must not be greater than actual
        if (proposed < actual) {
          isValid = false;
          message = `For material ${material}, proposed quantity (${proposed}) cannot be greater than actual available quantity (${actual}).`;
          break;
        }

        // Rule 2: shortage tolerance check (20%)
        const diffPercentage = ((proposed - actual) / proposed) * 100;
        if (diffPercentage > 20) {
          isValid = false;
          message = `For material ${material}, the proposed quantity exceeds the actual quantity by more than 20% tolerance.`;
          break;
        }
      }
    }

    // Step 3: return results
    return {
      materialTotals: totals,
      validationStatus: { isValid, message }
    };
  }, [items]);

  return (
    <View style={[styles.card, { borderColor: statusMap[status].color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {statusMap[status].icon}
          <Text style={styles.cardTitle}>Delivery Order: {doNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusMap[status].color }]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
          
        </View>
        
        <View style={styles.materialTotals}>
          {Object.entries(materialTotals).map(([material, totals]) => (
            <View key={material} style={styles.materialTotalItem}>
              <Text style={styles.materialText}>{material}:</Text>
              <Text style={styles.actualText}>{totals.actual}</Text>
              <Text style={styles.slashText}>/</Text>
              <Text style={styles.proposedText}>{totals.proposed}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.cardActions}>
          {status !== 'completed' && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onToggleEditMode(doNo)}
              >
                {isEditing ? <SaveIcon /> : <EditIcon />}
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity
                  style={[styles.transferButton, !validationStatus.isValid && styles.disabledButton]}
                  onPress={() => onTransfer(group)}
                  disabled={!validationStatus.isValid}
                >
                  <FileCheckIcon />
                  <Text style={styles.transferButtonText}>Complete Load</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      
      <View style={styles.cardContent}>
        {isEditing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>VEP</Text>
                <Text style={styles.tableHeaderCell}>Item</Text>
                <Text style={styles.tableHeaderCell}>Posnr</Text>
                <Text style={styles.tableHeaderCell}>Material</Text>
                <Text style={styles.tableHeaderCell}>Proposed Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Batch</Text>
                <Text style={styles.tableHeaderCell}>Storage Type</Text>
                <Text style={styles.tableHeaderCell}>Proposed Sloc</Text>
                <Text style={styles.tableHeaderCell}>Dest. Sloc</Text>
                <Text style={styles.tableHeaderCell}>Actions</Text>
                <Text style={styles.tableHeaderCell}>Stack Value</Text>
              </View>
              
              {items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.vepToken}</Text>
                  <Text style={styles.tableCell}>{item.uecha}</Text>
                  <Text style={styles.tableCell}>{item.posnr}</Text>
                  
                  <View style={styles.tableCell}>
                    <Text style={styles.materialName}>{item.material}</Text>
                    <Text style={styles.materialDescription}>{item.materialDes}</Text>
                  </View>
                  
                  <Text style={styles.tableCell}>{item.qty} {item.uom}</Text>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualQuantity.toString()}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualQuantity", value)}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualBatch}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualBatch", value)}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.storageType}
                      options={StorageTypes.filter(st => st !== '')}
                      onSelect={(value) => onItemChange(doNo, item.id, "storageType", value)}
                      placeholder="Select Type"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <Text style={styles.tableCell}>{item.storage}</Text>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.destSloc}
                      options={DestSlocs}
                      onSelect={(value) => onItemChange(doNo, item.id, "destSloc", value)}
                      placeholder="Select SLOC"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDuplicateItem(doNo, item.id)}
                      >
                        <CopyIcon />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDeleteItem(doNo, item.id)}
                      >
                        <TrashIcon />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.STACKVAL || ""}
                      onChangeText={(value) => onItemChange(doNo, item.id, "STACKVAL", value)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemMaterial}>{item.material}</Text>
                <Text style={styles.itemDescription}>{item.materialDes}</Text>
                <Text>Qty: <Text style={styles.boldText}>{item.actualQuantity}</Text> 
                  <Text style={styles.mutedText}> ({item.qty})</Text>
                </Text>
                <Text>Batch: <Text style={styles.boldText}>{item.actualBatch}</Text> 
                  <Text style={styles.mutedText}> ({item.batch})</Text>
                </Text>
                <Text>Storage: <Text style={styles.boldText}>{item.storageType}</Text></Text>
                <Text>Dest: <Text style={styles.boldText}>{item.destSloc}</Text></Text>
              </View>
            ))}
          </View>
        )}
        
        {(isEditing && validationStatus.message) && (
          <View style={styles.errorAlert}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>Validation Error</Text>
              <Text style={styles.alertDescription}>{validationStatus.message}</Text>
            </View>
          </View>
        )}
        
        {!isEditing && group.validation.message && (
          <View style={[
            styles.alert,
            group.validation.status === 'success' ? styles.successAlert : 
            group.validation.status === 'warning' ? styles.warningAlert : 
            styles.errorAlert
          ]}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>{group.validation.status}</Text>
              <Text style={styles.alertDescription}>{group.validation.message}</Text>
            </View>
          </View>
        )}
        
        {transferError && (
          <View style={styles.transferError}>
            <ErrorIcon />
            <View style={styles.transferErrorContent}>
              <Text style={styles.transferErrorTitle}>Transfer Error</Text>
              <Text style={styles.transferErrorDescription}>{transferError}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const StockTransfer: React.FC<StockTransferProps> = ({ odbGroups, onTransferComplete }) => {
  const [groups, setGroups] = useState(odbGroups);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isTransferComplete, setIsTransferComplete] = useState(false);

  const hasPendingTransfers = useMemo(() => {
    return groups.some(group => group.status === "pending" || group.isEditing);
  }, [groups]);

  const allGroupsAreTransferred = useMemo(() => {
    return groups.length > 0 && groups.every(group => group.status === "transferred" || group.status === "completed");
  }, [groups]);

  useEffect(() => {
    if (allGroupsAreTransferred) {
      setIsTransferComplete(true);
    }
  }, [allGroupsAreTransferred]);

  const handleTransfer = async (group: ODBGroup): Promise<void> => {
    setGroups((prev) =>
      prev.map((g) => (g.doNo === group.doNo ? { ...g, status: "loading", transferError: undefined } : g))
    );

    try {
      const requestBody = {
        doNo: group.doNo,
        items: group.items.map((item) => ({
          material: item.material,
          originalQuantity: item.qty,
          actualQuantity: item.actualQuantity,
          originalBatch: item.batch,
          actualBatch: item.actualBatch,
          uom: item.uom,
          bin: item.bin,
          storage: item.storage,
          storageType: item.storageType,
          destSloc: item.destSloc,
          plant: item.plant,
          warehouse: item.warehouse,
          posnr: item.posnr,
          vepToken: item.vepToken,
          uecha: item.uecha,
          docCata: item.docCata || '',
          STACKVAL: item.STACKVAL || ''
        })),
      };

      const data = await sendStockTransfer(requestBody);

      let newStatus: ODBGroup["status"];

      if (data.status === "success") {
        newStatus = "transferred";
      } else if (data.status === "warning") {
        newStatus = "transferred";
      } else {
        newStatus = "error";
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: newStatus,
                isEditing: false,
                validation: { status: data.status, message: data.message },
                items: data.data?.items || g.items,
                pickingPayload: data.data?.pickingPayload,
                sapResponse: data.data?.sapResponse,
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Stock transfer failed due to an unexpected error.";
      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: "error",
                validation: { status: "error", message: errorMessage },
                transferError: errorMessage,
              }
            : g
        )
      );
    }
  };

  const handleTransferAll = async () => {
    const pendingGroups = groups.filter((g) => g.status === "pending" || g.isEditing);
    if (pendingGroups.length === 0) {
      setGlobalError("No pending ODBs to transfer.");
      return;
    }
    setGlobalError(null);
    await Promise.all(pendingGroups.map(group => handleTransfer(group)));
  };

  const handleItemChange = (doNo: string, itemId: string, field: keyof ODBItem, value: any) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const newItems = group.items.map((item) => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              if (field === "actualQuantity") {
                updatedItem.actualQuantity = Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value);
              }
              return updatedItem;
            }
            return item;
          });
          return { ...group, items: newItems };
        }
        return group;
      })
    );
  };

  const handleDuplicateItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const itemToDuplicate = group.items.find((item) => item.id === itemId)
          if (!itemToDuplicate) return group
          const duplicatedItem: ODBItem = {
            ...itemToDuplicate,
            id: uuidv4(),
            isNew: true,
            qty: 0,
            actualQuantity: 0,
            actualBatch: ""
          }
          const itemIndex = group.items.findIndex((item) => item.id === itemId)
          const newItems = [...group.items]
          newItems.splice(itemIndex + 1, 0, duplicatedItem)
          return { ...group, items: newItems }
        }
        return group
      })
    )
  };

  const handleDeleteItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
          : group
      )
    )
  };

  const toggleEditMode = (doNo: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, isEditing: !group.isEditing, validation: { status: null, message: null }, transferError: undefined }
          : group
      )
    );
  };

  if (isTransferComplete) {
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Stock Transfer Complete!</Text>
        <Text style={styles.completeDescription}>All ODBs have been successfully transferred.</Text>
        <CheckIcon />
        <TouchableOpacity style={styles.completeButton} onPress={() => onTransferComplete(groups)}>
          <Text style={styles.completeButtonText}>Move to Picking</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loading & Stock Transfer</Text>
        <TouchableOpacity
          style={[styles.transferAllButton, !hasPendingTransfers && styles.disabledButton]}
          onPress={handleTransferAll}
          disabled={!hasPendingTransfers}
        >
          <Text style={styles.transferAllButtonText}>Transfer All Pending</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
      
      {globalError && (
        <View style={styles.globalError}>
          <ErrorIcon />
          <View style={styles.globalErrorContent}>
            <Text style={styles.globalErrorTitle}>Transfer Error</Text>
            <Text style={styles.globalErrorDescription}>{globalError}</Text>
          </View>
          <TouchableOpacity onPress={() => setGlobalError(null)}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {groups.map((group) => (
          <ODBGroupCard
            key={group.doNo}
            group={group}
            onToggleEditMode={toggleEditMode}
            onItemChange={handleItemChange}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onTransfer={handleTransfer}
          />
        ))}
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
    color: '#2c3e50',
  },
  transferAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transferAllButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9ebea',
    padding: 6,
    borderRadius: 4,
    marginLeft: 8,
    gap: 4,
  },
  errorBadgeText: {
    fontSize: 10,
    color: '#c0392b',
    fontWeight: '500',
  },
  materialTotals: {
    marginLeft: 16,
  },
  materialTotalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  materialText: {
    fontWeight: '500',
    fontSize: 12,
    color: '#7f8c8d',
  },
  actualText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 12,
  },
  slashText: {
    marginHorizontal: 2,
    fontSize: 12,
    color: '#7f8c8d',
  },
  proposedText: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f8c8d',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    width: 100,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tableCell: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  materialName: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#2c3e50',
  },
  materialDescription: {
    fontSize: 8,
    color: '#7f8c8d',
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    minWidth: 60,
    backgroundColor: '#f8f9fa',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemMaterial: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2c3e50',
  },
  itemDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  mutedText: {
    fontSize: 10,
    color: '#95a5a6',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  successAlert: {
    backgroundColor: '#d1f2eb',
    borderColor: '#27ae60',
  },
  warningAlert: {
    backgroundColor: '#fef9e7',
    borderColor: '#f39c12',
  },
  errorAlert: {
    backgroundColor: '#f9ebea',
    borderColor: '#e74c3c',
  },
  alertTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
  },
  transferError: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#f9ebea',
    borderColor: '#e74c3c',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  transferErrorContent: {
    flex: 1,
  },
  transferErrorTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#c0392b',
  },
  transferErrorDescription: {
    fontSize: 12,
    color: '#c0392b',
  },
  globalError: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9ebea',
    borderColor: '#e74c3c',
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  globalErrorContent: {
    flex: 1,
  },
  globalErrorTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#c0392b',
  },
  globalErrorDescription: {
    fontSize: 12,
    color: '#c0392b',
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    fontSize: 16,
  },
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    width: '100%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8f9fa',
    minHeight: 32,
  },
  dropdownValue: {
    fontSize: 10,
    color: '#2c3e50',
  },
  dropdownPlaceholder: {
    fontSize: 10,
    color: '#95a5a6',
  },
  // Modal styles for dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2c3e50',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdown: {
    minWidth: 80,
  },
});

export default StockTransfer;

*/

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
const StorageTypes = ["EDO", "RVP", "SCK", ""] as const;
const DestSlocs = ["ZF05", "ZF04", "ZF03", "ZF02", "ZF01"] as const;
const TruckTypes = ["S", "M", "L", "XL", "XXL"] as const;

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
  storageType: typeof StorageTypes[number];
  destSloc: typeof DestSlocs[number];
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
  stackValue?: string;
  STACKVAL?: string;
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
  transferError?: string;
}

interface StockTransferProps {
  odbGroups: ODBGroup[];
  onTransferComplete: (groups: ODBGroup[]) => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    const token = btoa(`${username}:${password}`);
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

// Define SAP response types
interface SapResponse {
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: {
    items?: ODBItem[];
    pickingPayload?: any;
    sapResponse?: any;
  };
}

// Helper function to extract cookies from response headers
const extractCookiesFromHeaders = (headers: any): string => {
  const cookies: string[] = [];
  
  // Check for set-cookie header (could be array or single value)
  const setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'];
  
  if (Array.isArray(setCookieHeader)) {
    setCookieHeader.forEach(cookie => {
      const cookieValue = cookie.split(';')[0];
      cookies.push(cookieValue);
    });
  } else if (setCookieHeader) {
    const cookieValue = setCookieHeader.split(';')[0];
    cookies.push(cookieValue);
  }
  
  return cookies.join('; ');
};

// Format date to DD.MM.YYYY
const formatDate = (date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

// Format time to HH:MM:SS
const formatTime = (date: Date): string => {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
};

// Parse date from DD.MM.YYYY format
const parseDate = (dateString: string): Date => {
  const [day, month, year] = dateString.split('.').map(Number);
  return new Date(year, month - 1, day);
};

// Parse time from HH:MM:SS format
const parseTime = (timeString: string): Date => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, seconds);
  return date;
};

// Stock Transfer API call - Fixed for React Native
const sendStockTransfer = async (requestBody: any): Promise<SapResponse> => {
  const SAP_URL = 'https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/sap/ZSTOCK_MOVE_SRV/StockHeadSet';
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  
  try {
    // Step 1: Fetch CSRF token from SAP
    const headResponse = await fetch(SAP_URL, {
      method: 'HEAD',
      headers: {
        'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
        'x-csrf-token': 'fetch',
        'accept': 'application/json',
        'sap-client': SAP_CLIENT,
      },
    });

    if (!headResponse.ok) {
      const errorDetails = await headResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${errorDetails}`);
    }

    const csrfToken = headResponse.headers.get('x-csrf-token');
    const cookies = extractCookiesFromHeaders(headResponse.headers);

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Prepare the payload for the SAP OData service
    const { doNo, items, truckType, loadingStartDate, loadingStartTime } = requestBody;
    const payload = {
      Dono: doNo,
      TruckType: truckType,
      TINDT: loadingStartDate,
      TINZE: loadingStartTime,
      OrderToItem: items.map((item: any) => ({
        Posnr: item.posnr,
        Matnr: item.material,
        Batch: item.actualBatch,
        Quantity: item.actualQuantity?.toString(),
        Uom: item.uom,
        StorageType: item.storageType,
        Storage: item.storage,
        ToStorage: item.destSloc,
        VepToken: item.vepToken || '',
        DocCata: item.docCata || '',
        UECHA: item.uecha || '',
        STACKVAL: item.STACKVAL || ''
      })),
    };

    // Step 2: Make the actual POST request with the obtained token
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
      'x-csrf-token': csrfToken,
      'sap-client': SAP_CLIENT,
      'accept': 'application/json',
    };

    // Add cookies if available
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const stockMoveResponse = await fetch(SAP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await stockMoveResponse.text();

    if (!stockMoveResponse.ok) {
      let errorMessage = `SAP stock transfer failed with HTTP status: ${stockMoveResponse.status}`;
      try {
        const errorResult = JSON.parse(responseText);
        errorMessage = errorResult.error?.message?.value || errorMessage;
      } catch (parseError) {
        const xmlMatch = responseText.match(/<message[^>]*>([^<]+)<\/message>/);
        if (xmlMatch && xmlMatch[1]) {
          errorMessage = xmlMatch[1];
        }
      }
      throw new Error(errorMessage);
    }

    // Parse the response with proper typing
    const result: any = JSON.parse(responseText);
    
    const firstItem = result.d?.OrderToItem?.results[0];
    const rawMessage = firstItem?.Message;
    
    if (rawMessage?.includes("Transfer posting Completed")) {
      const pickingPayload = {
        tokenno: firstItem.VepToken,
        getloadingsequence: {
          results: result.d?.OrderToItem?.results.map((sapItem: any) => ({
            tokenno: sapItem.VepToken,
            obd_no: result.d.Dono,
            posnr: sapItem.Posnr,
            matnr: sapItem.Matnr,
            charg: sapItem.Batch,
            sequenceno: sapItem.Sequenceno || '01',
            maktx: sapItem.Matnr || '',
            pstyv: sapItem.DocCata,
            speLoekz: false,
            werks: 'M251',
            lgort: sapItem.destSloc,
            lgnum: sapItem.Warehouse,
            lgtyp: sapItem.StorageType,
            docknum: '',
            lgpla: sapItem.Bin || '',
            lfimg: sapItem.Quantity,
            meins: sapItem.Uom,
            bolnr: '',
            tanum: '',
            oldcharg: sapItem.OldBatch,
            vtweg: '',
            uecha: sapItem.UECHA || ''
          }))
        }
      };
      
      return {
        status: 'success',
        message: rawMessage,
        data: {
          pickingPayload: pickingPayload,
          sapResponse: result
        }
      };
    } else if (rawMessage?.includes("Already Transfer posting Completed")) {
      return {
        status: 'warning',
        message: rawMessage,
        data: { items: items }
      };
    } else {
      return {
        status: 'error',
        message: rawMessage || "An unknown error occurred.",
        data: result
      };
    }
  } catch (error) {
    console.error('Error in stock transfer:', error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ClockIcon = () => <Text style={styles.icon}>⏰</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EditIcon = () => <Text style={styles.icon}>✏️</Text>;
const TrashIcon = () => <Text style={styles.icon}>🗑️</Text>;
const FileCheckIcon = () => <Text style={styles.icon}>📋</Text>;
const SaveIcon = () => <Text style={styles.icon}>💾</Text>;
const CopyIcon = () => <Text style={styles.icon}>📋</Text>;
const AlertIcon = () => <Text style={styles.icon}>⚠️</Text>;
const DropdownIcon = () => <Text style={styles.icon}>▼</Text>;
const CloseIcon = () => <Text style={styles.icon}>✕</Text>;
const CalendarIcon = () => <Text style={styles.icon}>📅</Text>;
const TimeIcon = () => <Text style={styles.icon}>⏱️</Text>;

// Custom Dropdown Component with Modal
const CustomDropdown = ({
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity 
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <DropdownIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === item && styles.modalOptionSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

// Date Picker Component using custom modal
const DatePickerField = ({ value, onChange, placeholder = "Select date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(value ? parseDate(value) : new Date());

  const handleConfirm = () => {
    onChange(formatDate(selectedDate));
    setIsOpen(false);
  };

  const handleDayChange = (day) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(day);
    setSelectedDate(newDate);
  };

  const handleMonthChange = (month) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(month - 1);
    setSelectedDate(newDate);
  };

  const handleYearChange = (year) => {
    const newDate = new Date(selectedDate);
    newDate.setFullYear(year);
    setSelectedDate(newDate);
  };

  const renderDayOptions = () => {
    const days = Array.from({ length: 31 }, (_, i) => i + 1);
    return days.map(day => (
      <TouchableOpacity
        key={day}
        style={[
          styles.dateTimeOption,
          selectedDate.getDate() === day && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleDayChange(day)}
      >
        <Text style={styles.dateTimeOptionText}>{day}</Text>
      </TouchableOpacity>
    ));
  };

  const renderMonthOptions = () => {
    const months = [
      "01", "02", "03", "04", "05", "06", 
      "07", "08", "09", "10", "11", "12"
    ];
    return months.map(month => (
      <TouchableOpacity
        key={month}
        style={[
          styles.dateTimeOption,
          (selectedDate.getMonth() + 1) === parseInt(month) && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleMonthChange(parseInt(month))}
      >
        <Text style={styles.dateTimeOptionText}>{month}</Text>
      </TouchableOpacity>
    ));
  };

  const renderYearOptions = () => {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);
    return years.map(year => (
      <TouchableOpacity
        key={year}
        style={[
          styles.dateTimeOption,
          selectedDate.getFullYear() === year && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleYearChange(year)}
      >
        <Text style={styles.dateTimeOptionText}>{year}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.dateTimeContainer}>
      <TouchableOpacity 
        style={styles.dateTimeInput} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dateTimeValue : styles.dateTimePlaceholder}>
          {value || placeholder}
        </Text>
        <CalendarIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.dateTimeModalOverlay}>
          <View style={styles.dateTimeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Date</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Day</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderDayOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Month</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderMonthOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Year</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderYearOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeModalFooter}>
              <Text style={styles.selectedDateTime}>
                Selected: {formatDate(selectedDate)}
              </Text>
              <TouchableOpacity 
                style={styles.dateTimeConfirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.dateTimeConfirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// Time Picker Component using custom modal
const TimePickerField = ({ value, onChange, placeholder = "Select time" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTime, setSelectedTime] = useState(value ? parseTime(value) : new Date());

  const handleConfirm = () => {
    onChange(formatTime(selectedTime));
    setIsOpen(false);
  };

  const handleHourChange = (hour) => {
    const newTime = new Date(selectedTime);
    newTime.setHours(hour);
    setSelectedTime(newTime);
  };

  const handleMinuteChange = (minute) => {
    const newTime = new Date(selectedTime);
    newTime.setMinutes(minute);
    setSelectedTime(newTime);
  };

  const handleSecondChange = (second) => {
    const newTime = new Date(selectedTime);
    newTime.setSeconds(second);
    setSelectedTime(newTime);
  };

  const renderHourOptions = () => {
    const hours = Array.from({ length: 24 }, (_, i) => i);
    return hours.map(hour => (
      <TouchableOpacity
        key={hour}
        style={[
          styles.dateTimeOption,
          selectedTime.getHours() === hour && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleHourChange(hour)}
      >
        <Text style={styles.dateTimeOptionText}>{hour.toString().padStart(2, '0')}</Text>
      </TouchableOpacity>
    ));
  };

  const renderMinuteOptions = () => {
    const minutes = Array.from({ length: 60 }, (_, i) => i);
    return minutes.map(minute => (
      <TouchableOpacity
        key={minute}
        style={[
          styles.dateTimeOption,
          selectedTime.getMinutes() === minute && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleMinuteChange(minute)}
      >
        <Text style={styles.dateTimeOptionText}>{minute.toString().padStart(2, '0')}</Text>
      </TouchableOpacity>
    ));
  };

  const renderSecondOptions = () => {
    const seconds = Array.from({ length: 60 }, (_, i) => i);
    return seconds.map(second => (
      <TouchableOpacity
        key={second}
        style={[
          styles.dateTimeOption,
          selectedTime.getSeconds() === second && styles.dateTimeOptionSelected
        ]}
        onPress={() => handleSecondChange(second)}
      >
        <Text style={styles.dateTimeOptionText}>{second.toString().padStart(2, '0')}</Text>
      </TouchableOpacity>
    ));
  };

  return (
    <View style={styles.dateTimeContainer}>
      <TouchableOpacity 
        style={styles.dateTimeInput} 
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dateTimeValue : styles.dateTimePlaceholder}>
          {value || placeholder}
        </Text>
        <TimeIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <View style={styles.dateTimeModalOverlay}>
          <View style={styles.dateTimeModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Hour</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderHourOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Minute</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderMinuteOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeSection}>
              <Text style={styles.dateTimeSectionTitle}>Second</Text>
              <ScrollView style={styles.dateTimeOptionsContainer}>
                <View style={styles.dateTimeOptionsGrid}>
                  {renderSecondOptions()}
                </View>
              </ScrollView>
            </View>
            
            <View style={styles.dateTimeModalFooter}>
              <Text style={styles.selectedDateTime}>
                Selected: {formatTime(selectedTime)}
              </Text>
              <TouchableOpacity 
                style={styles.dateTimeConfirmButton}
                onPress={handleConfirm}
              >
                <Text style={styles.dateTimeConfirmButtonText}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

interface ODBGroupCardProps {
  group: ODBGroup;
  onToggleEditMode: (doNo: string) => void;
  onItemChange: (doNo: string, itemId: string, field: keyof ODBItem, value: any) => void;
  onDuplicateItem: (doNo: string, itemId: string) => void;
  onDeleteItem: (doNo: string, itemId: string) => void;
  onTransfer: (group: ODBGroup) => void;
}

const ODBGroupCard = ({ 
  group, 
  onToggleEditMode, 
  onItemChange, 
  onDuplicateItem, 
  onDeleteItem, 
  onTransfer
}: ODBGroupCardProps) => {
  const { doNo, items, status, isEditing, transferError } = group;
  
  const statusMap: Record<typeof status, { color: string; icon: React.ReactNode }> = {
    pending: { color: "#6b7280", icon: <ClockIcon /> },
    loading: { color: "#f59e0b", icon: <ActivityIndicator size="small" color="#f59e0b" /> },
    completed: { color: "#10b981", icon: <CheckIcon /> },
    error: { color: "#ef4444", icon: <ErrorIcon /> },
    transferred: { color: "#3b82f6", icon: <CheckIcon /> },
    picked: { color: "#8b5cf6", icon: <CheckIcon /> },
  };

  const { materialTotals, validationStatus } = useMemo(() => {
    const totals: { [key: string]: { proposed: number; actual: number } } = {};
    let isValid = true;
    let message: string | null = null;

    // Step 1: aggregate totals
    items.forEach(item => {
      if (!totals[item.material]) {
        totals[item.material] = { proposed: 0, actual: 0 };
      }
      totals[item.material].proposed += item.qty;
      totals[item.material].actual += item.actualQuantity;
    });

    // Step 2: validation
    for (const material in totals) {
      const { proposed, actual } = totals[material];

      if (actual > 0) {
        // Rule 1: proposed must not be greater than actual
        if (proposed < actual) {
          isValid = false;
          message = `For material ${material}, proposed quantity (${proposed}) cannot be greater than actual available quantity (${actual}).`;
          break;
        }

        // Rule 2: shortage tolerance check (20%)
        const diffPercentage = ((proposed - actual) / proposed) * 100;
        if (diffPercentage > 20) {
          isValid = false;
          message = `For material ${material}, the proposed quantity exceeds the actual quantity by more than 20% tolerance.`;
          break;
        }
      }
    }

    // Step 3: return results
    return {
      materialTotals: totals,
      validationStatus: { isValid, message }
    };
  }, [items]);

  return (
    <View style={[styles.card, { borderColor: statusMap[status].color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {statusMap[status].icon}
          <Text style={styles.cardTitle}>Delivery Order: {doNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusMap[status].color }]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
          {transferError && (
            <View style={styles.errorBadge}>
              <ErrorIcon />
              <Text style={styles.errorBadgeText}>Error</Text>
            </View>
          )}
        </View>
        
        <View style={styles.materialTotals}>
          {Object.entries(materialTotals).map(([material, totals]) => (
            <View key={material} style={styles.materialTotalItem}>
              <Text style={styles.materialText}>{material}:</Text>
              <Text style={styles.actualText}>{totals.actual}</Text>
              <Text style={styles.slashText}>/</Text>
              <Text style={styles.proposedText}>{totals.proposed}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.cardActions}>
          {status !== 'completed' && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onToggleEditMode(doNo)}
              >
                {isEditing ? <SaveIcon /> : <EditIcon />}
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity
                  style={[styles.transferButton, !validationStatus.isValid && styles.disabledButton]}
                  onPress={() => onTransfer(group)}
                  disabled={!validationStatus.isValid}
                >
                  <FileCheckIcon />
                  <Text style={styles.transferButtonText}>Complete Load</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      
      <View style={styles.cardContent}>
        {isEditing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>VEP</Text>
                <Text style={styles.tableHeaderCell}>Item</Text>
                <Text style={styles.tableHeaderCell}>Posnr</Text>
                <Text style={styles.tableHeaderCell}>Material</Text>
                <Text style={styles.tableHeaderCell}>Proposed Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Batch</Text>
                <Text style={styles.tableHeaderCell}>Storage Type</Text>
                <Text style={styles.tableHeaderCell}>Proposed Sloc</Text>
                <Text style={styles.tableHeaderCell}>Dest. Sloc</Text>
                <Text style={styles.tableHeaderCell}>Actions</Text>
                <Text style={styles.tableHeaderCell}>Stack Value</Text>
              </View>
              
              {items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.vepToken}</Text>
                  <Text style={styles.tableCell}>{item.uecha}</Text>
                  <Text style={styles.tableCell}>{item.posnr}</Text>
                  
                  <View style={styles.tableCell}>
                    <Text style={styles.materialName}>{item.material}</Text>
                    <Text style={styles.materialDescription}>{item.materialDes}</Text>
                  </View>
                  
                  <Text style={styles.tableCell}>{item.qty} {item.uom}</Text>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualQuantity.toString()}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualQuantity", value)}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualBatch}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualBatch", value)}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.storageType}
                      options={StorageTypes.filter(st => st !== '')}
                      onSelect={(value) => onItemChange(doNo, item.id, "storageType", value)}
                      placeholder="Select Type"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <Text style={styles.tableCell}>{item.storage}</Text>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.destSloc}
                      options={DestSlocs}
                      onSelect={(value) => onItemChange(doNo, item.id, "destSloc", value)}
                      placeholder="Select SLOC"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDuplicateItem(doNo, item.id)}
                      >
                        <CopyIcon />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDeleteItem(doNo, item.id)}
                      >
                        <TrashIcon />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.STACKVAL || ""}
                      onChangeText={(value) => onItemChange(doNo, item.id, "STACKVAL", value)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemMaterial}>{item.material}</Text>
                <Text style={styles.itemDescription}>{item.materialDes}</Text>
                <Text>Qty: <Text style={styles.boldText}>{item.actualQuantity}</Text> 
                  <Text style={styles.mutedText}> ({item.qty})</Text>
                </Text>
                <Text>Batch: <Text style={styles.boldText}>{item.actualBatch}</Text> 
                  <Text style={styles.mutedText}> ({item.batch})</Text>
                </Text>
                <Text>Storage: <Text style={styles.boldText}>{item.storageType}</Text></Text>
                <Text>Dest: <Text style={styles.boldText}>{item.destSloc}</Text></Text>
              </View>
            ))}
          </View>
        )}
        
        {(isEditing && validationStatus.message) && (
          <View style={styles.errorAlert}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>Validation Error</Text>
              <Text style={styles.alertDescription}>{validationStatus.message}</Text>
            </View>
          </View>
        )}
        
        {!isEditing && group.validation.message && (
          <View style={[
            styles.alert,
            group.validation.status === 'success' ? styles.successAlert : 
            group.validation.status === 'warning' ? styles.warningAlert : 
            styles.errorAlert
          ]}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>{group.validation.status}</Text>
              <Text style={styles.alertDescription}>{group.validation.message}</Text>
            </View>
          </View>
        )}
        
        {transferError && (
          <View style={styles.transferError}>
            <ErrorIcon />
            <View style={styles.transferErrorContent}>
              <Text style={styles.transferErrorTitle}>Transfer Error</Text>
              <Text style={styles.transferErrorDescription}>{transferError}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const StockTransfer: React.FC<StockTransferProps> = ({ odbGroups, onTransferComplete }) => {
  const [groups, setGroups] = useState(odbGroups);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isTransferComplete, setIsTransferComplete] = useState(false);
  const [truckType, setTruckType] = useState<typeof TruckTypes[number]>("");
  const [loadingStartDate, setLoadingStartDate] = useState("");
  const [loadingStartTime, setLoadingStartTime] = useState("");

  const hasPendingTransfers = useMemo(() => {
    return groups.some(group => group.status === "pending" || group.isEditing);
  }, [groups]);

  const allGroupsAreTransferred = useMemo(() => {
    return groups.length > 0 && groups.every(group => group.status === "transferred" || group.status === "completed");
  }, [groups]);

  useEffect(() => {
    if (allGroupsAreTransferred) {
      setIsTransferComplete(true);
    }
  }, [allGroupsAreTransferred]);

  const handleTransfer = async (group: ODBGroup): Promise<void> => {
    setGroups((prev) =>
      prev.map((g) => (g.doNo === group.doNo ? { ...g, status: "loading", transferError: undefined } : g))
    );

    try {
      const requestBody = {
        doNo: group.doNo,
        truckType: truckType,
        loadingStartDate: loadingStartDate,
        loadingStartTime: loadingStartTime,
        items: group.items.map((item) => ({
          material: item.material,
          originalQuantity: item.qty,
          actualQuantity: item.actualQuantity,
          originalBatch: item.batch,
          actualBatch: item.actualBatch,
          uom: item.uom,
          bin: item.bin,
          storage: item.storage,
          storageType: item.storageType,
          destSloc: item.destSloc,
          plant: item.plant,
          warehouse: item.warehouse,
          posnr: item.posnr,
          vepToken: item.vepToken,
          uecha: item.uecha,
          docCata: item.docCata || '',
          STACKVAL: item.STACKVAL || ''
        })),
      };

      const data = await sendStockTransfer(requestBody);

      let newStatus: ODBGroup["status"];

      if (data.status === "success") {
        newStatus = "transferred";
      } else if (data.status === "warning") {
        newStatus = "transferred";
      } else {
        newStatus = "error";
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: newStatus,
                isEditing: false,
                validation: { status: data.status, message: data.message },
                items: data.data?.items || g.items,
                pickingPayload: data.data?.pickingPayload,
                sapResponse: data.data?.sapResponse,
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Stock transfer failed due to an unexpected error.";
      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: "error",
                validation: { status: "error", message: errorMessage },
                transferError: errorMessage,
              }
            : g
        )
      );
    }
  };

  const handleTransferAll = async () => {
    const pendingGroups = groups.filter((g) => g.status === "pending" || g.isEditing);
    if (pendingGroups.length === 0) {
      setGlobalError("No pending ODBs to transfer.");
      return;
    }
    
    // Validate truck info
    if (!truckType || !loadingStartDate || !loadingStartTime) {
      setGlobalError("Please fill in all truck information (Truck Type, Loading Date, and Loading Time)");
      return;
    }
    
    setGlobalError(null);
    await Promise.all(pendingGroups.map(group => handleTransfer(group)));
  };

  const handleItemChange = (doNo: string, itemId: string, field: keyof ODBItem, value: any) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const newItems = group.items.map((item) => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              if (field === "actualQuantity") {
                updatedItem.actualQuantity = Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value);
              }
              return updatedItem;
            }
            return item;
          });
          return { ...group, items: newItems };
        }
        return group;
      })
    );
  };

  const handleDuplicateItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const itemToDuplicate = group.items.find((item) => item.id === itemId)
          if (!itemToDuplicate) return group
          const duplicatedItem: ODBItem = {
            ...itemToDuplicate,
            id: uuidv4(),
            isNew: true,
            qty: 0,
            actualQuantity: 0,
            actualBatch: ""
          }
          const itemIndex = group.items.findIndex((item) => item.id === itemId)
          const newItems = [...group.items]
          newItems.splice(itemIndex + 1, 0, duplicatedItem)
          return { ...group, items: newItems }
        }
        return group
      })
    )
  };

  const handleDeleteItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
          : group
      )
    )
  };

  const toggleEditMode = (doNo: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, isEditing: !group.isEditing, validation: { status: null, message: null }, transferError: undefined }
          : group
      )
    );
  };

  if (isTransferComplete) {
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Stock Transfer Complete!</Text>
        <Text style={styles.completeDescription}>All ODBs have been successfully transferred.</Text>
        <CheckIcon />
        <TouchableOpacity style={styles.completeButton} onPress={() => onTransferComplete(groups)}>
          <Text style={styles.completeButtonText}>Move to Picking</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loading & Stock Transfer</Text>
        <TouchableOpacity
          style={[styles.transferAllButton, !hasPendingTransfers && styles.disabledButton]}
          onPress={handleTransferAll}
          disabled={!hasPendingTransfers}
        >
          <Text style={styles.transferAllButtonText}>Transfer All Pending</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
      
      {/* Truck Information Section - Outside of ODB cards */}
      <View style={styles.truckInfoGlobalContainer}>
        <Text style={styles.truckInfoGlobalTitle}>Truck Information</Text>
        
        <View style={styles.truckInfoGlobalRow}>
          <Text style={styles.truckInfoGlobalLabel}>Truck Type:</Text>
          <CustomDropdown
            value={truckType}
            options={TruckTypes}
            onSelect={setTruckType}
            placeholder="Select Truck Type"
            style={styles.truckTypeGlobalDropdown}
          />
        </View>
        
        <View style={styles.truckInfoGlobalRow}>
          <Text style={styles.truckInfoGlobalLabel}>Loading Date:</Text>
          <DatePickerField
            value={loadingStartDate}
            onChange={setLoadingStartDate}
            placeholder="DD.MM.YYYY"
          />
        </View>
        
        <View style={styles.truckInfoGlobalRow}>
          <Text style={styles.truckInfoGlobalLabel}>Loading Time:</Text>
          <TimePickerField
            value={loadingStartTime}
            onChange={setLoadingStartTime}
            placeholder="HH:MM:SS"
          />
        </View>
        
        {(truckType || loadingStartDate || loadingStartTime) && (
          <View style={styles.truckInfoSummary}>
            <Text style={styles.truckInfoSummaryTitle}>Selected Truck Information:</Text>
            <Text style={styles.truckInfoSummaryText}>Truck Type: {truckType || 'Not set'}</Text>
            <Text style={styles.truckInfoSummaryText}>Loading Date: {loadingStartDate || 'Not set'}</Text>
            <Text style={styles.truckInfoSummaryText}>Loading Time: {loadingStartTime || 'Not set'}</Text>
          </View>
        )}
      </View>
      
      {globalError && (
        <View style={styles.globalError}>
          <ErrorIcon />
          <View style={styles.globalErrorContent}>
            <Text style={styles.globalErrorTitle}>Transfer Error</Text>
            <Text style={styles.globalErrorDescription}>{globalError}</Text>
          </View>
          <TouchableOpacity onPress={() => setGlobalError(null)}>
            <CloseIcon />
          </TouchableOpacity>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {groups.map((group) => (
          <ODBGroupCard
            key={group.doNo}
            group={group}
            onToggleEditMode={toggleEditMode}
            onItemChange={handleItemChange}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onTransfer={handleTransfer}
          />
        ))}
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
    color: '#2c3e50',
  },
  transferAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transferAllButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  // Global truck info styles
  truckInfoGlobalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  truckInfoGlobalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 16,
  },
  truckInfoGlobalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  truckInfoGlobalLabel: {
    fontWeight: 'bold',
    width: 120,
    color: '#2c3e50',
  },
  truckTypeGlobalDropdown: {
    flex: 1,
    minWidth: 100,
  },
  truckInfoSummary: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  truckInfoSummaryTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#2c3e50',
  },
  truckInfoSummaryText: {
    marginBottom: 4,
    color: '#2c3e50',
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  errorBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9ebea',
    padding: 6,
    borderRadius: 4,
    marginLeft: 8,
    gap: 4,
  },
  errorBadgeText: {
    fontSize: 10,
    color: '#c0392b',
    fontWeight: '500',
  },
  materialTotals: {
    marginLeft: 16,
  },
      materialTotalItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    materialText: {
        fontWeight: '500',
        fontSize: 12,
        color: '#7f8c8d',
    },
    actualText: {
        color: '#3498db',
        fontWeight: 'bold',
        fontSize: 12,
    },
    slashText: {
        marginHorizontal: 2,
        fontSize: 12,
        color: '#7f8c8d',
    },
    proposedText: {
        color: '#2ecc71',
        fontSize: 12,
        fontWeight: '500',
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 8,
    },
    editButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#7f8c8d',
        padding: 8,
        borderRadius: 6,
        gap: 4,
    },
    editButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    transferButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#2ecc71',
        padding: 8,
        borderRadius: 6,
        gap: 4,
    },
    transferButtonText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '500',
    },
    cardContent: {
        gap: 16,
    },
    // Date/Time Container styles
    dateTimeContainer: {
        flex: 1,
    },
    dateTimeInput: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 4,
        padding: 8,
        backgroundColor: '#fff',
    },
    dateTimeValue: {
        fontSize: 14,
        color: '#2c3e50',
    },
    dateTimePlaceholder: {
        fontSize: 14,
        color: '#95a5a6',
    },
    // Date/Time Modal styles
    dateTimeModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dateTimeModalContent: {
        backgroundColor: 'white',
        borderRadius: 12,
        width: '90%',
        maxHeight: '85%',
        overflow: 'hidden',
    },
    dateTimeSection: {
        marginBottom: 16,
        paddingHorizontal: 16,
    },
    dateTimeSectionTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#2c3e50',
    },
    dateTimeOptionsContainer: {
        maxHeight: 120,
    },
    dateTimeOptionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dateTimeOption: {
        padding: 8,
        borderRadius: 4,
        backgroundColor: '#f3f4f6',
        minWidth: 50,
        alignItems: 'center',
    },
    dateTimeOptionSelected: {
        backgroundColor: '#3b82f6',
    },
    dateTimeOptionText: {
        fontSize: 14,
        color: '#2c3e50',
    },
    dateTimeModalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#e5e7eb',
        backgroundColor: '#f8f9fa',
    },
    selectedDateTime: {
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    dateTimeConfirmButton: {
        backgroundColor: '#3b82f6',
        padding: 10,
        borderRadius: 6,
    },
    dateTimeConfirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    table: {
        borderWidth: 1,
        borderColor: '#e5e7eb',
        borderRadius: 8,
        overflow: 'hidden',
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#34495e',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
    },
    tableHeaderCell: {
        width: 100,
        fontWeight: 'bold',
        fontSize: 10,
        textAlign: 'center',
        color: '#fff',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#fff',
    },
    tableCell: {
        width: 100,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 4,
    },
    materialName: {
        fontWeight: 'bold',
        fontSize: 10,
        color: '#2c3e50',
    },
    materialDescription: {
        fontSize: 8,
        color: '#7f8c8d',
    },
    tableInput: {
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 4,
        padding: 6,
        fontSize: 12,
        minWidth: 60,
        backgroundColor: '#f8f9fa',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 8,
    },
    actionButton: {
        padding: 6,
        backgroundColor: '#ecf0f1',
        borderRadius: 4,
    },
    itemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    itemCard: {
        backgroundColor: '#f8f9fa',
        padding: 12,
        borderRadius: 8,
        minWidth: 150,
        borderWidth: 1,
        borderColor: '#e5e7eb',
    },
    itemMaterial: {
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#2c3e50',
    },
    itemDescription: {
        fontSize: 12,
        color: '#7f8c8d',
        marginBottom: 8,
    },
    boldText: {
        fontWeight: 'bold',
        color: '#2c3e50',
    },
    mutedText: {
        fontSize: 10,
        color: '#95a5a6',
    },
    alert: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        gap: 8,
        borderWidth: 1,
    },
    successAlert: {
        backgroundColor: '#d1f2eb',
        borderColor: '#27ae60',
    },
    warningAlert: {
        backgroundColor: '#fef9e7',
        borderColor: '#f39c12',
    },
    errorAlert: {
        backgroundColor: '#f9ebea',
        borderColor: '#e74c3c',
    },
    alertTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
    },
    alertDescription: {
        fontSize: 12,
    },
    transferError: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: '#f9ebea',
        borderColor: '#e74c3c',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        gap: 8,
    },
    transferErrorContent: {
        flex: 1,
    },
    transferErrorTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#c0392b',
    },
    transferErrorDescription: {
        fontSize: 12,
        color: '#c0392b',
    },
    globalError: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f9ebea',
        borderColor: '#e74c3c',
        borderWidth: 1,
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        gap: 8,
    },
    globalErrorContent: {
        flex: 1,
    },
    globalErrorTitle: {
        fontWeight: 'bold',
        marginBottom: 4,
        color: '#c0392b',
    },
    globalErrorDescription: {
        fontSize: 12,
        color: '#c0392b',
    },
    completeContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    completeTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#27ae60',
        marginBottom: 8,
               textAlign: 'center',
    },
    completeDescription: {
        fontSize: 16,
        color: '#7f8c8d',
        marginBottom: 20,
        textAlign: 'center',
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#27ae60',
        padding: 16,
        borderRadius: 8,
        gap: 8,
        marginTop: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    completeButtonText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    icon: {
        fontSize: 16,
    },
    // Dropdown styles
    dropdownContainer: {
        position: 'relative',
        width: '100%',
    },
    dropdownHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#d1d5db',
        borderRadius: 4,
        padding: 6,
        backgroundColor: '#f8f9fa',
        minHeight: 32,
    },
    dropdownValue: {
        fontSize: 10,
        color: '#2c3e50',
    },
    dropdownPlaceholder: {
        fontSize: 10,
        color: '#95a5a6',
    },
    // Modal styles for dropdown
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 8,
        width: '80%',
        maxHeight: '60%',
        overflow: 'hidden',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#e5e7eb',
        backgroundColor: '#f8f9fa',
    },
    modalTitle: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#2c3e50',
    },
    modalOption: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f4f6',
    },
    modalOptionSelected: {
        backgroundColor: '#e3f2fd',
    },
    modalOptionText: {
        fontSize: 14,
        color: '#2c3e50',
    },
    dropdown: {
        minWidth: 80,
    },
});

export default StockTransfer;
    

//complete code
/*
import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  FlatList,
  Dimensions,
} from 'react-native';
import { v4 as uuidv4 } from 'uuid';

// --- Type Definitions ---
const StorageTypes = ["EDO", "RVP", "SCK", ""] as const;
const DestSlocs = ["ZF05", "ZF04", "ZF03", "ZF02", "ZF01"] as const;

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
  storageType: typeof StorageTypes[number];
  destSloc: typeof DestSlocs[number];
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
  stackValue?: string;
  STACKVAL?: string;
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

interface StockTransferProps {
  odbGroups: ODBGroup[];
  onTransferComplete: (groups: ODBGroup[]) => void;
}

// Basic Auth utility functions
const BasicAuth = {
  getAuthHeader: (username: string, password: string): string => {
    const token = `${username}:${password}`;
    return `Basic ${btoa(token)}`;
  },

  setCredentials: (username: string, password: string): void => {
    const token = btoa(`${username}:${password}`);
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

// Define SAP response types
interface SapResponse {
  status: 'success' | 'warning' | 'error';
  message: string;
  data?: {
    items?: ODBItem[];
    pickingPayload?: any;
    sapResponse?: any;
  };
}

// Helper function to extract cookies from response headers
const extractCookiesFromHeaders = (headers: any): string => {
  const cookies: string[] = [];
  
  // Check for set-cookie header (could be array or single value)
  const setCookieHeader = headers['set-cookie'] || headers['Set-Cookie'];
  
  if (Array.isArray(setCookieHeader)) {
    setCookieHeader.forEach(cookie => {
      const cookieValue = cookie.split(';')[0];
      cookies.push(cookieValue);
    });
  } else if (setCookieHeader) {
    const cookieValue = setCookieHeader.split(';')[0];
    cookies.push(cookieValue);
  }
  
  return cookies.join('; ');
};

// Stock Transfer API call - Fixed for React Native
const sendStockTransfer = async (requestBody: any): Promise<SapResponse> => {
  const SAP_URL = 'https://eqas4app.emamiagrotech.com:4443/sap/opu/odata/sap/ZSTOCK_MOVE_SRV/StockHeadSet';
  const SAP_USERNAME = 'VERTIF_01';
  const SAP_PASSWORD = 'EmamiWM@Qas24';
  const SAP_CLIENT = '300';
  
  try {
    // Step 1: Fetch CSRF token from SAP
    const headResponse = await fetch(SAP_URL, {
      method: 'HEAD',
      headers: {
        'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
        'x-csrf-token': 'fetch',
        'accept': 'application/json',
        'sap-client': SAP_CLIENT,
      },
    });

    if (!headResponse.ok) {
      const errorDetails = await headResponse.text();
      throw new Error(`Failed to fetch CSRF token: ${errorDetails}`);
    }

    const csrfToken = headResponse.headers.get('x-csrf-token');
    const cookies = extractCookiesFromHeaders(headResponse.headers);

    if (!csrfToken) {
      throw new Error('CSRF token not found in response');
    }

    // Prepare the payload for the SAP OData service
    const { doNo, items } = requestBody;
    const payload = {
      Dono: doNo,
      OrderToItem: items.map((item: any) => ({
        Posnr: item.posnr,
        Matnr: item.material,
        Batch: item.actualBatch,
        Quantity: item.actualQuantity?.toString(),
        Uom: item.uom,
        StorageType: item.storageType,
        Storage: item.storage,
        ToStorage: item.destSloc,
        VepToken: item.vepToken || '',
        DocCata: item.docCata || '',
        UECHA: item.uecha || '',
        STACKVAL: item.STACKVAL || ''
      })),
    };

    // Step 2: Make the actual POST request with the obtained token
    const headers: any = {
      'Content-Type': 'application/json',
      'Authorization': BasicAuth.getAuthHeader(SAP_USERNAME, SAP_PASSWORD),
      'x-csrf-token': csrfToken,
      'sap-client': SAP_CLIENT,
      'accept': 'application/json',
    };

    // Add cookies if available
    if (cookies) {
      headers['Cookie'] = cookies;
    }

    const stockMoveResponse = await fetch(SAP_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const responseText = await stockMoveResponse.text();

    if (!stockMoveResponse.ok) {
      let errorMessage = `SAP stock transfer failed with HTTP status: ${stockMoveResponse.status}`;
      try {
        const errorResult = JSON.parse(responseText);
        errorMessage = errorResult.error?.message?.value || errorMessage;
      } catch (parseError) {
        const xmlMatch = responseText.match(/<message[^>]*>([^<]+)<\/message>/);
        if (xmlMatch && xmlMatch[1]) {
          errorMessage = xmlMatch[1];
        }
      }
      throw new Error(errorMessage);
    }

    // Parse the response with proper typing
    const result: any = JSON.parse(responseText);
    
    const firstItem = result.d?.OrderToItem?.results[0];
    const rawMessage = firstItem?.Message;
    
    if (rawMessage?.includes("Transfer posting Completed")) {
      const pickingPayload = {
        tokenno: firstItem.VepToken,
        getloadingsequence: {
          results: result.d?.OrderToItem?.results.map((sapItem: any) => ({
            tokenno: sapItem.VepToken,
            obd_no: result.d.Dono,
            posnr: sapItem.Posnr,
            matnr: sapItem.Matnr,
            charg: sapItem.Batch,
            sequenceno: sapItem.Sequenceno || '01',
            maktx: sapItem.Matnr || '',
            pstyv: sapItem.DocCata,
            speLoekz: false,
            werks: 'M251',
            lgort: sapItem.destSloc,
            lgnum: sapItem.Warehouse,
            lgtyp: sapItem.StorageType,
            docknum: '',
            lgpla: sapItem.Bin || '',
            lfimg: sapItem.Quantity,
            meins: sapItem.Uom,
            bolnr: '',
            tanum: '',
            oldcharg: sapItem.OldBatch,
            vtweg: '',
            uecha: sapItem.UECHA || ''
          }))
        }
      };
      
      return {
        status: 'success',
        message: rawMessage,
        data: {
          pickingPayload: pickingPayload,
          sapResponse: result
        }
      };
    } else if (rawMessage?.includes("Already Transfer posting Completed")) {
      return {
        status: 'warning',
        message: rawMessage,
        data: { items: items }
      };
    } else {
      return {
        status: 'error',
        message: rawMessage || "An unknown error occurred.",
        data: result
      };
    }
  } catch (error) {
    console.error('Error in stock transfer:', error);
    throw error;
  }
};

// Simple icons using text
const CheckIcon = () => <Text style={styles.icon}>✅</Text>;
const ErrorIcon = () => <Text style={styles.icon}>❌</Text>;
const ClockIcon = () => <Text style={styles.icon}>⏰</Text>;
const ArrowRightIcon = () => <Text style={styles.icon}>→</Text>;
const EditIcon = () => <Text style={styles.icon}>✏️</Text>;
const TrashIcon = () => <Text style={styles.icon}>🗑️</Text>;
const FileCheckIcon = () => <Text style={styles.icon}>📋</Text>;
const SaveIcon = () => <Text style={styles.icon}>💾</Text>;
const CopyIcon = () => <Text style={styles.icon}>📋</Text>;
const AlertIcon = () => <Text style={styles.icon}>⚠️</Text>;
const DropdownIcon = () => <Text style={styles.icon}>▼</Text>;
const CloseIcon = () => <Text style={styles.icon}>✕</Text>;

// Custom Dropdown Component with Modal
const CustomDropdown = ({
  value,
  options,
  onSelect,
  placeholder = "Select an option",
  style = {},
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSelect = (option) => {
    onSelect(option);
    setIsOpen(false);
  };

  return (
    <View style={[styles.dropdownContainer, style]}>
      <TouchableOpacity 
        style={styles.dropdownHeader}
        onPress={() => setIsOpen(true)}
      >
        <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
          {value || placeholder}
        </Text>
        <DropdownIcon />
      </TouchableOpacity>
      
      <Modal
        visible={isOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setIsOpen(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{placeholder}</Text>
              <TouchableOpacity onPress={() => setIsOpen(false)}>
                <CloseIcon />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.modalOption,
                    value === item && styles.modalOptionSelected
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.modalOptionText}>{item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const ODBGroupCard = ({ 
  group, 
  onToggleEditMode, 
  onItemChange, 
  onDuplicateItem, 
  onDeleteItem, 
  onTransfer 
}: { 
  group: ODBGroup; 
  onToggleEditMode: (doNo: string) => void; 
  onItemChange: (doNo: string, itemId: string, field: keyof ODBItem, value: any) => void; 
  onDuplicateItem: (doNo: string, itemId: string) => void; 
  onDeleteItem: (doNo: string, itemId: string) => void; 
  onTransfer: (group: ODBGroup) => void; 
}) => {
  const { doNo, items, status, isEditing } = group;
  
  const statusMap: Record<typeof status, { color: string; icon: React.ReactNode }> = {
    pending: { color: "#6b7280", icon: <ClockIcon /> },
    loading: { color: "#f59e0b", icon: <ActivityIndicator size="small" color="#f59e0b" /> },
    completed: { color: "#10b981", icon: <CheckIcon /> },
    error: { color: "#ef4444", icon: <ErrorIcon /> },
    transferred: { color: "#3b82f6", icon: <CheckIcon /> },
    picked: { color: "#8b5cf6", icon: <CheckIcon /> },
  };

  const { materialTotals, validationStatus } = useMemo(() => {
    const totals: { [key: string]: { proposed: number; actual: number } } = {};
    let isValid = true;
    let message: string | null = null;

    // Step 1: aggregate totals
    items.forEach(item => {
      if (!totals[item.material]) {
        totals[item.material] = { proposed: 0, actual: 0 };
      }
      totals[item.material].proposed += item.qty;
      totals[item.material].actual += item.actualQuantity;
    });

    // Step 2: validation
    for (const material in totals) {
      const { proposed, actual } = totals[material];

      if (actual > 0) {
        // Rule 1: proposed must not be greater than actual
        if (proposed < actual) {
          isValid = false;
          message = `For material ${material}, proposed quantity (${proposed}) cannot be greater than actual available quantity (${actual}).`;
          break;
        }

        // Rule 2: shortage tolerance check (20%)
        const diffPercentage = ((proposed - actual) / proposed) * 100;
        if (diffPercentage > 20) {
          isValid = false;
          message = `For material ${material}, the proposed quantity exceeds the actual quantity by more than 20% tolerance.`;
          break;
        }
      }
    }

    // Step 3: return results
    return {
      materialTotals: totals,
      validationStatus: { isValid, message }
    };
  }, [items]);

  return (
    <View style={[styles.card, { borderColor: statusMap[status].color }]}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          {statusMap[status].icon}
          <Text style={styles.cardTitle}>Delivery Order: {doNo}</Text>
          <View style={[styles.badge, { backgroundColor: statusMap[status].color }]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>
        
        <View style={styles.materialTotals}>
          {Object.entries(materialTotals).map(([material, totals]) => (
            <View key={material} style={styles.materialTotalItem}>
              <Text style={styles.materialText}>{material}:</Text>
              <Text style={styles.actualText}>{totals.actual}</Text>
              <Text style={styles.slashText}>/</Text>
              <Text style={styles.proposedText}>{totals.proposed}</Text>
            </View>
          ))}
        </View>
        
        <View style={styles.cardActions}>
          {status !== 'completed' && (
            <>
              <TouchableOpacity 
                style={styles.editButton}
                onPress={() => onToggleEditMode(doNo)}
              >
                {isEditing ? <SaveIcon /> : <EditIcon />}
                <Text style={styles.editButtonText}>
                  {isEditing ? 'Save' : 'Edit'}
                </Text>
              </TouchableOpacity>
              
              {isEditing && (
                <TouchableOpacity
                  style={[styles.transferButton, !validationStatus.isValid && styles.disabledButton]}
                  onPress={() => onTransfer(group)}
                  disabled={!validationStatus.isValid}
                >
                  <FileCheckIcon />
                  <Text style={styles.transferButtonText}>Complete Load</Text>
                </TouchableOpacity>
              )}
            </>
          )}
        </View>
      </View>
      
      <View style={styles.cardContent}>
        {isEditing ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.table}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderCell}>VEP</Text>
                <Text style={styles.tableHeaderCell}>Item</Text>
                <Text style={styles.tableHeaderCell}>Posnr</Text>
                <Text style={styles.tableHeaderCell}>Material</Text>
                <Text style={styles.tableHeaderCell}>Proposed Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Qty</Text>
                <Text style={styles.tableHeaderCell}>Actual Batch</Text>
                <Text style={styles.tableHeaderCell}>Storage Type</Text>
                <Text style={styles.tableHeaderCell}>Proposed Sloc</Text>
                <Text style={styles.tableHeaderCell}>Dest. Sloc</Text>
                <Text style={styles.tableHeaderCell}>Actions</Text>
                <Text style={styles.tableHeaderCell}>Stack Value</Text>
              </View>
              
              {items.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{item.vepToken}</Text>
                  <Text style={styles.tableCell}>{item.uecha}</Text>
                  <Text style={styles.tableCell}>{item.posnr}</Text>
                  
                  <View style={styles.tableCell}>
                    <Text style={styles.materialName}>{item.material}</Text>
                    <Text style={styles.materialDescription}>{item.materialDes}</Text>
                  </View>
                  
                  <Text style={styles.tableCell}>{item.qty} {item.uom}</Text>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualQuantity.toString()}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualQuantity", value)}
                      keyboardType="numeric"
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.actualBatch}
                      onChangeText={(value) => onItemChange(doNo, item.id, "actualBatch", value)}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.storageType}
                      options={StorageTypes.filter(st => st !== '')}
                      onSelect={(value) => onItemChange(doNo, item.id, "storageType", value)}
                      placeholder="Select Type"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <Text style={styles.tableCell}>{item.storage}</Text>
                  
                  <View style={styles.tableCell}>
                    <CustomDropdown
                      value={item.destSloc}
                      options={DestSlocs}
                      onSelect={(value) => onItemChange(doNo, item.id, "destSloc", value)}
                      placeholder="Select SLOC"
                      style={styles.dropdown}
                    />
                  </View>
                  
                  <View style={styles.tableCell}>
                    <View style={styles.actionButtons}>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDuplicateItem(doNo, item.id)}
                      >
                        <CopyIcon />
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => onDeleteItem(doNo, item.id)}
                      >
                        <TrashIcon />
                      </TouchableOpacity>
                    </View>
                  </View>
                  
                  <View style={styles.tableCell}>
                    <TextInput
                      style={styles.tableInput}
                      value={item.STACKVAL || ""}
                      onChangeText={(value) => onItemChange(doNo, item.id, "STACKVAL", value)}
                    />
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.itemsGrid}>
            {items.map(item => (
              <View key={item.id} style={styles.itemCard}>
                <Text style={styles.itemMaterial}>{item.material}</Text>
                <Text style={styles.itemDescription}>{item.materialDes}</Text>
                <Text>Qty: <Text style={styles.boldText}>{item.actualQuantity}</Text> 
                  <Text style={styles.mutedText}> ({item.qty})</Text>
                </Text>
                <Text>Batch: <Text style={styles.boldText}>{item.actualBatch}</Text> 
                  <Text style={styles.mutedText}> ({item.batch})</Text>
                </Text>
                <Text>Storage: <Text style={styles.boldText}>{item.storageType}</Text></Text>
                <Text>Dest: <Text style={styles.boldText}>{item.destSloc}</Text></Text>
              </View>
            ))}
          </View>
        )}
        
        {(isEditing && validationStatus.message) && (
          <View style={styles.errorAlert}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>Validation Error</Text>
              <Text style={styles.alertDescription}>{validationStatus.message}</Text>
            </View>
          </View>
        )}
        
        {!isEditing && group.validation.message && (
          <View style={[
            styles.alert,
            group.validation.status === 'success' ? styles.successAlert : 
            group.validation.status === 'warning' ? styles.warningAlert : 
            styles.errorAlert
          ]}>
            <AlertIcon />
            <View>
              <Text style={styles.alertTitle}>{group.validation.status}</Text>
              <Text style={styles.alertDescription}>{group.validation.message}</Text>
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const StockTransfer: React.FC<StockTransferProps> = ({ odbGroups, onTransferComplete }) => {
  const [groups, setGroups] = useState(odbGroups);
  const [error, setError] = useState<string | null>(null);
  const [isTransferComplete, setIsTransferComplete] = useState(false);

  const hasPendingTransfers = useMemo(() => {
    return groups.some(group => group.status === "pending" || group.isEditing);
  }, [groups]);

  const allGroupsAreTransferred = useMemo(() => {
    return groups.length > 0 && groups.every(group => group.status === "transferred" || group.status === "completed");
  }, [groups]);

  useEffect(() => {
    if (allGroupsAreTransferred) {
      setIsTransferComplete(true);
    }
  }, [allGroupsAreTransferred]);

  const handleTransfer = async (group: ODBGroup): Promise<void> => {
    setGroups((prev) =>
      prev.map((g) => (g.doNo === group.doNo ? { ...g, status: "loading" } : g))
    );

    try {
      const requestBody = {
        doNo: group.doNo,
        items: group.items.map((item) => ({
          material: item.material,
          originalQuantity: item.qty,
          actualQuantity: item.actualQuantity,
          originalBatch: item.batch,
          actualBatch: item.actualBatch,
          uom: item.uom,
          bin: item.bin,
          storage: item.storage,
          storageType: item.storageType,
          destSloc: item.destSloc,
          plant: item.plant,
          warehouse: item.warehouse,
          posnr: item.posnr,
          vepToken: item.vepToken,
          uecha: item.uecha,
          docCata: item.docCata || '',
          STACKVAL: item.STACKVAL || ''
        })),
      };

      const data = await sendStockTransfer(requestBody);

      let newStatus: ODBGroup["status"];

      if (data.status === "success") {
        newStatus = "transferred";
      } else if (data.status === "warning") {
        newStatus = "transferred";
      } else {
        newStatus = "error";
      }

      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
            ? {
                ...g,
                status: newStatus,
                isEditing: false,
                validation: { status: data.status, message: data.message },
                items: data.data?.items || g.items,
                pickingPayload: data.data?.pickingPayload,
                sapResponse: data.data?.sapResponse,
              }
            : g
        )
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Stock transfer failed due to an unexpected error.";
      setGroups((prev) =>
        prev.map((g) =>
          g.doNo === group.doNo
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

  const handleTransferAll = async () => {
    const pendingGroups = groups.filter((g) => g.status === "pending" || g.isEditing);
    if (pendingGroups.length === 0) {
      setError("No pending ODBs to transfer.");
      return;
    }
    setError(null);
    await Promise.all(pendingGroups.map(group => handleTransfer(group)));
  };

  const handleItemChange = (doNo: string, itemId: string, field: keyof ODBItem, value: any) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const newItems = group.items.map((item) => {
            if (item.id === itemId) {
              const updatedItem = { ...item, [field]: value };
              if (field === "actualQuantity") {
                updatedItem.actualQuantity = Number.isNaN(parseFloat(value)) ? 0 : parseFloat(value);
              }
              return updatedItem;
            }
            return item;
          });
          return { ...group, items: newItems };
        }
        return group;
      })
    );
  };

  const handleDuplicateItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) => {
        if (group.doNo === doNo) {
          const itemToDuplicate = group.items.find((item) => item.id === itemId)
          if (!itemToDuplicate) return group
          const duplicatedItem: ODBItem = {
            ...itemToDuplicate,
            id: uuidv4(),
            isNew: true,
            qty: 0,
            actualQuantity: 0,
            actualBatch: ""
          }
          const itemIndex = group.items.findIndex((item) => item.id === itemId)
          const newItems = [...group.items]
          newItems.splice(itemIndex + 1, 0, duplicatedItem)
          return { ...group, items: newItems }
        }
        return group
      })
    )
  };

  const handleDeleteItem = (doNo: string, itemId: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, items: group.items.filter((item) => item.id !== itemId) }
          : group
      )
    )
  };

  const toggleEditMode = (doNo: string) => {
    setGroups((prev) =>
      prev.map((group) =>
        group.doNo === doNo
          ? { ...group, isEditing: !group.isEditing, validation: { status: null, message: null } }
          : group
      )
    );
  };

  if (isTransferComplete) {
    return (
      <View style={styles.completeContainer}>
        <Text style={styles.completeTitle}>Stock Transfer Complete!</Text>
        <Text style={styles.completeDescription}>All ODBs have been successfully transferred.</Text>
        <CheckIcon />
        <TouchableOpacity style={styles.completeButton} onPress={() => onTransferComplete(groups)}>
          <Text style={styles.completeButtonText}>Move to Picking</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Loading & Stock Transfer</Text>
        <TouchableOpacity
          style={[styles.transferAllButton, !hasPendingTransfers && styles.disabledButton]}
          onPress={handleTransferAll}
          disabled={!hasPendingTransfers}
        >
          <Text style={styles.transferAllButtonText}>Transfer All Pending</Text>
          <ArrowRightIcon />
        </TouchableOpacity>
      </View>
      
      {error && (
        <View style={styles.errorAlert}>
          <ErrorIcon />
          <View>
            <Text style={styles.alertTitle}>Error</Text>
            <Text style={styles.alertDescription}>{error}</Text>
          </View>
        </View>
      )}
      
      <ScrollView style={styles.scrollView}>
        {groups.map((group) => (
          <ODBGroupCard
            key={group.doNo}
            group={group}
            onToggleEditMode={toggleEditMode}
            onItemChange={handleItemChange}
            onDuplicateItem={handleDuplicateItem}
            onDeleteItem={handleDeleteItem}
            onTransfer={handleTransfer}
          />
        ))}
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
    color: '#2c3e50',
  },
  transferAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transferAllButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  materialTotals: {
    marginLeft: 16,
  },
  materialTotalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  materialText: {
    fontWeight: '500',
    fontSize: 12,
    color: '#7f8c8d',
  },
  actualText: {
    color: '#3498db',
    fontWeight: 'bold',
    fontSize: 12,
  },
  slashText: {
    marginHorizontal: 2,
    fontSize: 12,
    color: '#7f8c8d',
  },
  proposedText: {
    color: '#2ecc71',
    fontSize: 12,
    fontWeight: '500',
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#7f8c8d',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  transferButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2ecc71',
    padding: 8,
    borderRadius: 6,
    gap: 4,
  },
  transferButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  cardContent: {
    gap: 16,
  },
  table: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 8,
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#34495e',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tableHeaderCell: {
    width: 100,
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'center',
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#fff',
  },
  tableCell: {
    width: 100,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 4,
  },
  materialName: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#2c3e50',
  },
  materialDescription: {
    fontSize: 8,
    color: '#7f8c8d',
  },
  tableInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    fontSize: 12,
    minWidth: 60,
    backgroundColor: '#f8f9fa',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 6,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  itemCard: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    minWidth: 150,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  itemMaterial: {
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#2c3e50',
  },
  itemDescription: {
    fontSize: 12,
    color: '#7f8c8d',
    marginBottom: 8,
  },
  boldText: {
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  mutedText: {
    fontSize: 10,
    color: '#95a5a6',
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
    borderWidth: 1,
  },
  successAlert: {
    backgroundColor: '#d1f2eb',
    borderColor: '#27ae60',
  },
  warningAlert: {
    backgroundColor: '#fef9e7',
    borderColor: '#f39c12',
  },
  errorAlert: {
    backgroundColor: '#f9ebea',
    borderColor: '#e74c3c',
  },
  alertTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 12,
  },
  completeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  completeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#27ae60',
    marginBottom: 8,
    textAlign: 'center',
  },
  completeDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 20,
    textAlign: 'center',
  },
  completeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27ae60',
    padding: 16,
    borderRadius: 8,
    gap: 8,
    marginTop: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  completeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  icon: {
    fontSize: 16,
  },
  // Dropdown styles
  dropdownContainer: {
    position: 'relative',
    width: '100%',
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 4,
    padding: 6,
    backgroundColor: '#f8f9fa',
    minHeight: 32,
  },
  dropdownValue: {
    fontSize: 10,
    color: '#2c3e50',
  },
  dropdownPlaceholder: {
    fontSize: 10,
    color: '#95a5a6',
  },
  // Modal styles for dropdown
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 8,
    width: '80%',
    maxHeight: '60%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    backgroundColor: '#f8f9fa',
  },
  modalTitle: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#2c3e50',
  },
  modalOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  modalOptionSelected: {
    backgroundColor: '#e3f2fd',
  },
  modalOptionText: {
    fontSize: 14,
    color: '#2c3e50',
  },
  dropdown: {
    minWidth: 80,
  },
});

export default StockTransfer;
*/


