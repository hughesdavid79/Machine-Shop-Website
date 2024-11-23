import React, { useState, useEffect } from 'react';
import { Plus, Minus, ChevronUp, ChevronDown, Edit2, Trash2, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useInventoryStore } from '../store/useInventoryStore';

interface InventoryItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  threshold: number;
}

type SortField = 'name' | 'description' | 'quantity' | 'threshold';
type SortDirection = 'asc' | 'desc';

const inputClasses = "rounded-md border-gray-500 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm";

const getStockStatus = (quantity: number, threshold: number) => {
  if (quantity <= threshold) {
    return { label: 'Low Stock', color: 'bg-red-100 text-red-800' };
  }
  if (quantity <= threshold * 1.5) {
    return { label: 'Stock Getting Low', color: 'bg-yellow-100 text-yellow-800' };
  }
  return { label: 'Sufficient Stock', color: 'bg-green-100 text-green-800' };
};

const Inventory = () => {
  const user = useAuthStore((state) => state.user);
  const { items, fetchInventory, updateItem, addItem, deleteItem } = useInventoryStore();
  const [sortField, setSortField] = useState<SortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newItem, setNewItem] = useState<Omit<InventoryItem, 'id'>>({
    name: '',
    description: '',
    quantity: 0,
    threshold: 0,
  });

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleAddItem = async () => {
    if (!newItem.name) return;
    
    try {
      await addItem(newItem);
      setNewItem({
        name: '',
        description: '',
        quantity: 0,
        threshold: 0,
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Failed to add item:', error);
    }
  };

  const adjustQuantity = async (id: number, amount: number) => {
    const item = items.find(i => i.id === id);
    if (!item) return;
    
    try {
      const newQuantity = Math.max(0, item.quantity + amount);
      await updateItem(id, { quantity: newQuantity });
    } catch (error) {
      console.error('Failed to update quantity:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    
    try {
      await deleteItem(id);
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="h-4 w-4" /> : 
      <ChevronDown className="h-4 w-4" />;
  };

  const sortedItems = [...items].sort((a, b) => {
    const modifier = sortDirection === 'asc' ? 1 : -1;
    if (typeof a[sortField] === 'string') {
      return (a[sortField] as string).localeCompare(b[sortField] as string) * modifier;
    }
    return ((a[sortField] as number) - (b[sortField] as number)) * modifier;
  });

  if (items.length === 0) {
    return (
      <div className="p-4">
        {user?.role === 'admin' && (
          <div className="text-center">
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
            >
              Add New Item
            </button>
            {showAddForm && (
              <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                  <input
                    type="text"
                    placeholder="Name *"
                    value={newItem.name}
                    onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                    className={inputClasses}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Description"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    className={inputClasses}
                  />
                  <input
                    type="number"
                    placeholder="Quantity *"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                    className={inputClasses}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Threshold *"
                    value={newItem.threshold}
                    onChange={(e) => setNewItem(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
                    className={inputClasses}
                    required
                  />
                </div>
                <div className="mt-4 flex justify-end space-x-3">
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddItem}
                    className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                  >
                    Add Item
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        <div className="text-center text-gray-500 mt-4">No items available</div>
      </div>
    );
  }

  return (
    <div className="p-4">
      {user?.role === 'admin' && !showAddForm && (
        <button
          onClick={() => setShowAddForm(true)}
          className="mb-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500"
        >
          Add New Item
        </button>
      )}

      {showAddForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Name *"
              value={newItem.name}
              onChange={(e) => setNewItem(prev => ({ ...prev, name: e.target.value }))}
              className={inputClasses}
              required
            />
            <input
              type="text"
              placeholder="Description"
              value={newItem.description}
              onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
              className={inputClasses}
            />
            <input
              type="number"
              placeholder="Quantity *"
              value={newItem.quantity}
              onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
              className={inputClasses}
              required
            />
            <input
              type="number"
              placeholder="Threshold *"
              value={newItem.threshold}
              onChange={(e) => setNewItem(prev => ({ ...prev, threshold: parseInt(e.target.value) || 0 }))}
              className={inputClasses}
              required
            />
          </div>
          <div className="mt-4 flex justify-end space-x-3">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleAddItem}
              className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
            >
              Add Item
            </button>
          </div>
        </div>
      )}

      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    { field: 'name' as SortField, label: 'Item Name' },
                    { field: 'description' as SortField, label: 'Description' },
                    { field: 'quantity' as SortField, label: 'Quantity' },
                    { field: 'threshold' as SortField, label: 'Status' },
                  ].map(({ field, label }) => (
                    <th
                      key={field}
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort(field)}
                    >
                      <div className="flex items-center space-x-2">
                        <span>{label}</span>
                        <SortIcon field={field} />
                      </div>
                    </th>
                  ))}
                  {user?.role === 'admin' && (
                    <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6">
                      <span className="sr-only">Actions</span>
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {sortedItems.map((item) => (
                  <tr key={item.id}>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className={inputClasses}
                          value={item.name}
                          onChange={(e) => updateItem(item.id, { name: e.target.value })}
                        />
                      ) : (
                        item.name
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {editingId === item.id ? (
                        <input
                          type="text"
                          className={inputClasses}
                          value={item.description}
                          onChange={(e) => updateItem(item.id, { description: e.target.value })}
                        />
                      ) : (
                        item.description
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => adjustQuantity(item.id, -1)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Minus className="h-4 w-4 text-gray-500" />
                        </button>
                        {editingId === item.id ? (
                          <input
                            type="number"
                            className={`${inputClasses} w-20`}
                            value={item.quantity}
                            onChange={(e) => updateItem(item.id, { quantity: parseInt(e.target.value) || 0 })}
                          />
                        ) : (
                          <span>{item.quantity}</span>
                        )}
                        <button
                          onClick={() => adjustQuantity(item.id, 1)}
                          className="p-1 rounded hover:bg-gray-100"
                        >
                          <Plus className="h-4 w-4 text-gray-500" />
                        </button>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm">
                      {editingId === item.id ? (
                        <input
                          type="number"
                          className={`${inputClasses} w-20`}
                          value={item.threshold}
                          onChange={(e) => updateItem(item.id, { threshold: parseInt(e.target.value) || 0 })}
                        />
                      ) : (
                        <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${getStockStatus(item.quantity, item.threshold).color}`}>
                          {getStockStatus(item.quantity, item.threshold).label}
                        </span>
                      )}
                    </td>
                    {user?.role === 'admin' && (
                      <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => setEditingId(editingId === item.id ? null : item.id)}
                            className="text-orange-600 hover:text-orange-900"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Inventory;