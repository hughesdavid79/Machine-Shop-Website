import React, { useState } from 'react';
import { useAuthStore } from '../store/useAuthStore';
import { Container, Plus, Minus, AlertTriangle } from 'lucide-react';
import { useQuery, useQueryClient } from 'react-query';
import { getBarrels, updateBarrel, updateBarrelCount, updateBarrelThreshold } from '../services/api';

interface Barrel {
  id: number;
  filled: boolean;
}

interface BarrelType {
  id: string;
  type: string;
  color: string;
  threshold: number;
  barrels: Barrel[];
}

const BarrelAlert: React.FC<{ type: BarrelType }> = ({ type }) => {
  const filledCount = type.barrels?.filter(b => b.filled).length || 0;
  const emptyCount = type.barrels?.filter(b => !b.filled).length || 0;
  
  let showAlert = false;
  let alertMessage = '';

  if (type.type === 'Chips' || type.type === 'Vacuum') {
    showAlert = filledCount >= type.threshold;
    alertMessage = `Warning: ${type.type} barrels need emptying`;
  } else {
    showAlert = filledCount <= type.threshold;
    alertMessage = `Low ${type.type} level - needs refill`;
  }

  if (!showAlert) return null;

  return (
    <div className="flex items-center text-yellow-700 mb-2">
      <AlertTriangle className="h-5 w-5 mr-2" />
      <span>{alertMessage}</span>
    </div>
  );
};

const BarrelRow: React.FC<{
  type: BarrelType;
  onToggleBarrel: (barrel: Barrel) => void;
  onUpdateCount: (typeId: string, action: 'increment' | 'decrement') => void;
  onUpdateThreshold: (typeId: string, threshold: number) => void;
  isAdmin: boolean;
}> = ({ type, onToggleBarrel, onUpdateCount, onUpdateThreshold, isAdmin }) => {
  const [isEditingThreshold, setIsEditingThreshold] = useState(false);
  const [thresholdValue, setThresholdValue] = useState(type.threshold);

  return (
    <div className="mb-8">
      <BarrelAlert type={type} />
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold">{type.type}</h3>
          <div className="w-4 h-4 rounded-full" style={{ backgroundColor: type.color }} />
        </div>
        
        {isAdmin && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => onUpdateCount(type.id, 'decrement')}
                className="p-1 rounded hover:bg-gray-100"
                title="Remove barrel"
              >
                <Minus size={20} />
              </button>
              <span>{type.barrels.length}</span>
              <button
                onClick={() => onUpdateCount(type.id, 'increment')}
                className="p-1 rounded hover:bg-gray-100"
                title="Add barrel"
              >
                <Plus size={20} />
              </button>
            </div>
            
            {isEditingThreshold ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={thresholdValue}
                  onChange={(e) => setThresholdValue(Number(e.target.value))}
                  className="w-16 px-2 py-1 border rounded"
                  min="1"
                />
                <button
                  onClick={() => {
                    onUpdateThreshold(type.id, thresholdValue);
                    setIsEditingThreshold(false);
                  }}
                  className="text-sm bg-blue-500 text-white px-2 py-1 rounded"
                >
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingThreshold(true)}
                className="text-sm text-gray-600 hover:text-gray-800"
                title="Edit threshold"
              >
                Threshold: {type.threshold}
              </button>
            )}
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-4">
        {type.barrels.map((barrel) => (
          <button
            key={barrel.id}
            onClick={() => onToggleBarrel(barrel)}
            className="transition-all duration-200 hover:scale-110 focus:outline-none"
            title={`${type.type} Barrel ${barrel.id} (${barrel.filled ? 'Filled' : 'Empty'})`}
          >
            <svg
              width="100"
              height="100"
              viewBox="0 0 24 24"
              fill={barrel.filled ? type.color : 'none'}
              stroke={type.color}
              strokeWidth="1.5"
              className="barrel-icon"
            >
              <path d="M3 7v10c0 2 2 4 4 4h10c2 0 4-2 4-4V7c0-2-2-4-4-4H7c-2 0-4 2-4 4z" />
              <path d="M3 7h18" />
              <path d="M3 17h18" />
            </svg>
          </button>
        ))}
      </div>
    </div>
  );
};

const Barrels = () => {
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin';
  const queryClient = useQueryClient();

  const { data: barrelTypes, isLoading, error, refetch } = useQuery(['barrels'], getBarrels);

  const handleToggleBarrel = async (barrel: Barrel) => {
    try {
      await updateBarrel(barrel.id, { filled: !barrel.filled });
      await queryClient.invalidateQueries(['barrels']);
    } catch (error) {
      console.error('Failed to toggle barrel:', error);
    }
  };

  const handleUpdateCount = async (typeId: string, action: 'increment' | 'decrement') => {
    try {
      await updateBarrelCount(typeId, action);
      await queryClient.invalidateQueries(['barrels']);
    } catch (error) {
      console.error('Failed to update barrel count:', error);
    }
  };

  const handleUpdateThreshold = async (typeId: string, threshold: number) => {
    try {
      await updateBarrelThreshold(typeId, threshold);
      await queryClient.invalidateQueries(['barrels']);
    } catch (error) {
      console.error('Failed to update threshold:', error);
    }
  };

  if (isLoading) return <div className="p-6">Loading barrels...</div>;
  
  if (error) return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Barrel Management</h2>
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
        <strong className="font-bold">Error loading barrels!</strong>
        <span className="block sm:inline"> Please try again later.</span>
        <button 
          onClick={() => refetch()} 
          className="mt-2 bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
        >
          Retry
        </button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Barrel Management</h2>
      <div className="space-y-8">
        {barrelTypes?.map((type) => (
          <BarrelRow
            key={type.id}
            type={type}
            isAdmin={isAdmin}
            onToggleBarrel={handleToggleBarrel}
            onUpdateCount={(typeId, action) => handleUpdateCount(typeId, action)}
            onUpdateThreshold={(typeId, threshold) => handleUpdateThreshold(typeId, threshold)}
          />
        ))}
      </div>
    </div>
  );
};

export default Barrels;