// auth.jsx

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';

const Auth = ({ onAuthSuccess }) => {
  const [vepToken, setVepToken] = useState('');

  const handleLogin = () => {
    // Pass the entered VEP token to the parent component
    if (vepToken) {
      onAuthSuccess(vepToken);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>VEP Token Entry</Text>
      <Text style={styles.subtitle}>Enter your VEP token below to proceed</Text>
      <TextInput
        style={styles.textInput}
        placeholder="Enter VEP Token No"
        placeholderTextColor="#6c757d"
        value={vepToken}
        onChangeText={setVepToken}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin}>
        <Text style={styles.buttonText}>Submit</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1a237e',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 30,
    color: '#6c757d',
    textAlign: 'center',
  },
  textInput: {
    width: '80%',
    backgroundColor: '#ffffff',
    color: '#000000',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  button: {
    backgroundColor: '#007bff',
    borderRadius: 10,
    paddingVertical: 15,
    paddingHorizontal: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default Auth;