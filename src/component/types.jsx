// In a real application, you would use a .d.ts or .ts file for type definitions.
// This file demonstrates the data structure for a JavaScript/JSX environment.

/**
 * @typedef {object} Material - Represents a single material line item.
 * @property {string} POSNR - Position number.
 * @property {string} MaterialNo - The material number.
 * @property {string} MaterialDescription - A description of the material.
 * @property {string} ProposedQty - The proposed quantity.
 * @property {string} ProposedBatchNo - The proposed batch number.
 * @property {string} Bin - Storage bin.
 * @property {string} Channel - The channel.
 * @property {string} DONo - Delivery order number.
 * @property {string} DocCata - Document category.
 * @property {string} Dock - Dock number.
 * @property {string} Storage - Storage location.
 * @property {string} StorageType - Storage type.
 * @property {string} ToNo - Transfer order number.
 * @property {string} UOM - Unit of measure.
 * @property {string} Uecha - Batch characteristic.
 * @property {string} Warehouse - Warehouse number.
 */
const Material = {
  POSNR: '',
  MaterialNo: '',
  MaterialDescription: '',
  ProposedQty: '',
  ProposedBatchNo: '',
  Bin: '',
  Channel: '',
  DONo: '',
  DocCata: '',
  Dock: '',
  Storage: '',
  StorageType: '',
  ToNo: '',
  UOM: '',
  Uecha: '',
  Warehouse: '',
};

/**
 * @typedef {object} OBD - Represents an outbound delivery.
 * @property {string} OBD_No - The outbound delivery number.
 * @property {Material[]} materials - An array of material line items.
 */
const OBD = {
  OBD_No: '',
  materials: [Material],
};

/**
 * @typedef {object} VEPData - Represents the main data payload from the API.
 * @property {string} VEPToken - A unique VEP token.
 * @property {OBD[]} OBDs - An array of outbound deliveries.
 */
const VEPData = {
  VEPToken: '',
  OBDs: [OBD],
};

export { VEPData, OBD, Material };
