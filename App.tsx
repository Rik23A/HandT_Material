// // App.tsx

// import React, { useState } from 'react';
// import { View, StyleSheet, SafeAreaView, StatusBar } from 'react-native';
// import Dashboard from './src/component/Dashbord';
// import Auth from './src/component/auth';

// const App = () => {
//   const [isLoggedIn, setIsLoggedIn] = useState(false);
//   const [vepToken, setVepToken] = useState('');

//   const handleAuthSuccess = (token) => {
//     setVepToken(token);
//     setIsLoggedIn(true);
//   };

//   const handleBack = () => {
//     setIsLoggedIn(false);
//     setVepToken('');
//   };

//   return (
//     <SafeAreaView style={styles.container}>
//       {/* <StatusBar barStyle="dark-content" /> */}
//       <StatusBar barStyle="light-content" />
//       {isLoggedIn ? (
//         <Dashboard onBack={handleBack} vepToken={vepToken} />
//       ) : (
//         <Auth onAuthSuccess={handleAuthSuccess} />
//       )}
//     </SafeAreaView>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     backgroundColor: '#f0f2f5',
//   },
// });

// export default App;



// App.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  AppState,
  AppStateStatus,
} from "react-native";
import Loading from "./src/h&t_material/Loading/Loading";
import StockTransfer from "./src/h&t_material/StockTransfer/StockTransfer";
import SapPicking from "./src/h&t_material/Picking/SapPicking";
import Gross from "./src/h&t_material/Gross/Gross";

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
  pickingPayload?: any;
  sapResponse?: any;
}

type WorkflowStep = "loading" | "transfer" | "picking" | "gross";

const TIMEOUT_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(true); // Set to true by default
  const [currentStep, setCurrentStep] = useState<WorkflowStep>("loading");
  const [odbGroups, setOdbGroups] = useState<ODBGroup[]>([]);
  const [stepHistory, setStepHistory] = useState<WorkflowStep[]>(["loading"]);
  
  const timeoutRef = useRef<NodeJS.Timeout>();
  const appState = useRef(AppState.currentState);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      console.log("User inactive for 20 minutes. Resetting...");
      handleStartNew();
    }, TIMEOUT_DURATION);
  };

  useEffect(() => {
    // Handle app state changes for background/foreground
    const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
      if (
        appState.current.match(/inactive|background/) &&
        nextAppState === "active"
      ) {
        // App has come to the foreground, reset timer
        resetTimer();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const steps: Record<WorkflowStep, { label: string; progress: number }> = {
    loading: { label: "Loading Data", progress: 25 },
    transfer: { label: "Stock Transfer", progress: 50 },
    picking: { label: "SAP Picking", progress: 75 },
    gross: { label: "Gross Calculation", progress: 100 },
  };

  const handleLoadingComplete = (groups: ODBGroup[]) => {
    setOdbGroups(groups);
    setCurrentStep("transfer");
    setStepHistory(prevHistory => [...prevHistory, "transfer"]);
    resetTimer(); // Reset timer on a workflow step completion
  };

  const handleTransferComplete = (groups: ODBGroup[]) => {
    setOdbGroups(groups);
    setCurrentStep("picking");
    setStepHistory(prevHistory => [...prevHistory, "picking"]);
    resetTimer();
  };

  const handlePickingComplete = () => {
    setCurrentStep("gross");
    setStepHistory(prevHistory => [...prevHistory, "gross"]);
    resetTimer();
  };

  const handleStartNew = () => {
    setOdbGroups([]);
    setStepHistory(["loading"]);
    setCurrentStep("loading");
    resetTimer();
  };

  const handleBack = () => {
    if (stepHistory.length > 1) {
      const newHistory = stepHistory.slice(0, -1);
      setCurrentStep(newHistory[newHistory.length - 1]);
      setStepHistory(newHistory);
      resetTimer();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case "loading":
        return <Loading onLoadingComplete={handleLoadingComplete} />;
      case "transfer":
        return <StockTransfer odbGroups={odbGroups} onTransferComplete={handleTransferComplete} />;
      case "picking":
        return <SapPicking odbGroups={odbGroups} onComplete={handlePickingComplete} />;
        case "gross":
          const vepToken = odbGroups.find(g => g.items.length > 0)?.items[0].vepToken;
          return <Gross onStartNew={handleStartNew} initialVepToken={vepToken} />;
      default:
        return null;
    }
  };

  const Header = () => {
    const currentProgress = steps[currentStep].progress;

    return (
      <View style={styles.headerContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>
            Workflow Progress: {steps[currentStep].label}
          </Text>
          <View style={styles.buttonRow}>
            {currentStep !== "loading" && (
              <TouchableOpacity
                onPress={handleBack}
                style={styles.button}
              >
                <Text style={styles.buttonText}>Back</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
        <View style={styles.progressBar}>
          <View 
            style={[styles.progressFill, { width: `${currentProgress}%` }]}
          />
        </View>
        <Text style={styles.progressText}>
          {currentProgress}% Complete
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.content}>
          <Header />
          {renderStepContent()}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  headerContainer: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 6,
    marginLeft: 8,
    marginBottom: 8,
    backgroundColor: 'white',
  },
  buttonText: {
    color: '#374151',
  },
  progressBar: {
    height: 10,
    backgroundColor: '#e5e7eb',
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#0284c7',
    borderRadius: 5,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
    color: '#6b7280',
  },
});