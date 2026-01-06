/**
 * @file index.ts
 * @description Barrel export for asset domain components
 * @module components/domains/operations/assets
 *
 * This module exports all asset-related components used across the application.
 *
 * Components by Category:
 *
 * Table Components:
 * - AssetListTableServerSearch: Admin asset list with server-side pagination
 * - EmployeeAssetListTable: Employee asset view with assignment filtering
 *
 * Detail Page Components:
 * - AssetHistory: Timeline of asset lifecycle events
 * - AssetCostBreakdown: Utilization metrics (assigned vs idle days)
 * - AssetMaintenanceRecords: Service/repair history management
 * - DepreciationCard: Depreciation values and category assignment
 *
 * Action Components:
 * - AssetActions: View button for table rows
 * - CloneAssetButton: Duplicate asset with confirmation
 * - DeleteAssetButton: Delete asset with confirmation
 * - DisposeAssetDialog: IFRS-compliant disposal with gain/loss preview
 *
 * Form Components:
 * - CategorySelector: Category dropdown (re-exported from separate file)
 * - AssetTypeCombobox: Type input with auto-suggest (re-exported from separate file)
 *
 * Usage:
 * ```typescript
 * import { AssetListTableServerSearch, DepreciationCard } from '@/components/domains/operations/assets';
 * ```
 */

export { AssetActions } from './asset-actions';
export { AssetCostBreakdown } from './asset-cost-breakdown';
export { default as AssetHistory } from './asset-history';
export { AssetListTableServerSearch } from './asset-list-table-server-search';
export { AssetMaintenanceRecords } from './asset-maintenance-records';
export { CloneAssetButton } from './clone-asset-button';
export { DeleteAssetButton } from './delete-asset-button';
export { DepreciationCard } from './depreciation-card';
export { DisposeAssetDialog } from './dispose-asset-dialog';
export { EmployeeAssetListTable } from './employee-asset-list-table';
export { CategorySelector } from './category-selector';
export { AssetTypeCombobox } from './asset-type-combobox';
