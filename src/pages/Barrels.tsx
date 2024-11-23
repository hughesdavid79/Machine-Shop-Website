import React, { useState, useMemo } from 'react';
import { AlertTriangle, Edit2 } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import { useBarrels } from '../hooks/useBarrels';
import { useQuery } from 'react-query';
import { getBarrels } from '../services/api';

interface Barrel {
  id: number;
  type: string;
  color: string;
  filled: boolean;
}

interface BarrelType {
  id: string;
  type: string;
  color: string;
  threshold: number;
  decrementOnFill: boolean;
  barrels: Barrel[];
}

const Barrels = () => {
  const user = useAuthStore((state) => state.user);
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [barrelTypes, setBarrelTypes] = useState<BarrelType[]>([
    {
      id: '1',
      type: 'Chips',
      color: '#000000',
      threshold: 2,
      decrementOnFill: false,
      barrels: Array(3).fill(null).map((_, i) => ({
        id: i + 1,
        type: 'Chips',
        color: '#000000',
        filled: false,
      })),
    },
    {
      id: '2',
      type: 'Vacuum',
      color: '#8B4513',
      threshold: 1,
      decrementOnFill: false,
      barrels: Array(2).fill(null).map((_, i) => ({
        id: i + 4,
        type: 'Vacuum',
        color: '#8B4513',
        filled: false,
      })),
    },
    {
      id: '3',
      type: 'Coolant',
      color: '#40E0D0',
      threshold: 2,
      decrementOnFill: true,
      barrels: Array(4).fill(null).map((_, i) => ({
        id: i + 6,
        type: 'Coolant',
        color: '#40E0D0',
        filled: true,
      })),
    },
    {
      id: '4',
      type: 'Oil',
      color: '#FFA500',
      threshold: 1,
      decrementOnFill: true,
      barrels: Array(3).fill(null).map((_, i) => ({
        id: i + 10,
        type: 'Oil',
        color: '#FFA500',
        filled: true,
      })),
    },
  ]);

  const getBarrelCount = (type: BarrelType) => {
    if (!type?.barrels) return 0;
    return type.barrels.filter(b => b.filled).length;
  };

  const alerts = useMemo(() => {
    if (!barrelTypes) return [];
    return barrelTypes.filter(type => {
      const filledCount = getBarrelCount(type);
      return filledCount <= type.threshold || filledCount >= type.barrels.length;
    });
  }, [barrelTypes]);

  return (
    <div>
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Barrel Management</h2>
        <p className="mt-1 text-sm text-gray-500">
          Monitor and manage barrel levels across different types.
        </p>
      </div>

      {alerts.length > 0 && (
        <div className="mb-8">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">Barrel alerts:</p>
                <ul className="mt-2 text-sm text-yellow-600">
                  {alerts.map(type => (
                    <li key={type.id}>
                      • {type.type}: {type.decrementOnFill
                        ? `Low on filled barrels (${getBarrelCount(type)} remaining)`
                        : `Too many filled barrels (${getBarrelCount(type)} filled)`}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {barrelTypes.map(type => (
          <div
            key={type.id}
            className="bg-white overflow-hidden shadow rounded-lg"
          >
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">{type.type}</h3>
                <div 
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: type.color }}
                />
              </div>
              {editingTypeId === type.id ? (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700">
                    Threshold
                  </label>
                  <input
                    type="number"
                    value={type.threshold}
                    onChange={(e) => handleUpdateThreshold(type.id, parseInt(e.target.value))}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  />
                </div>
              ) : (
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {type.barrels.map(barrel => (
                    <button
                      key={barrel.id}
                      onClick={() => handleToggleBarrel(type.id, barrel.id, barrel.filled)}
                      className={`h-12 w-12 rounded-full ${
                        barrel.filled ? 'bg-opacity-100' : 'bg-opacity-20'
                      }`}
                      style={{ backgroundColor: type.color }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Barrels;