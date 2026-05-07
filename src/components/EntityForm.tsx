/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Entity } from '../types';
import { Save, X, Building2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface EntityFormProps {
  entity?: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
}

export const EntityForm: React.FC<EntityFormProps> = ({ entity, onSave, onCancel }) => {
  const isEdit = !!entity;
  const [formData, setFormData] = useState<Entity>(entity || {
    id: `ent-${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    type: 'Company',
    registrationNumber: '',
    businessAddress: '',
    contactPerson: '',
    status: 'Active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const validate = (data: Entity) => {
    const newErrors: Record<string, string> = {};
    if (!data.name.trim()) {
      newErrors.name = 'Entity name is required';
    } else if (data.name.trim().length < 2) {
      newErrors.name = 'Name is too short';
    }

    if (!data.type) {
      newErrors.type = 'Select an entity type';
    }

    if (data.registrationNumber && data.registrationNumber.trim().length < 5) {
      newErrors.registrationNumber = 'Registration format invalid';
    }

    if (data.contactPerson && data.contactPerson.trim().length < 2) {
      newErrors.contactPerson = 'Contact name too short';
    }

    if (data.businessAddress && data.businessAddress.trim().length < 10) {
      newErrors.businessAddress = 'Enter a complete address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof Entity, value: string) => {
    const newData = { ...formData, [field]: value };
    setFormData(newData);
    
    // Real-time validation update
    const newErrors = { ...errors };
    if (field === 'name') {
      if (!value.trim()) newErrors.name = 'Entity name is required';
      else if (value.trim().length < 2) newErrors.name = 'Name is too short';
      else delete newErrors.name;
    }
    if (field === 'registrationNumber') {
      if (value && value.trim().length < 5) newErrors.registrationNumber = 'Invalid format';
      else delete newErrors.registrationNumber;
    }
    if (field === 'contactPerson') {
      if (value && value.trim().length < 2) newErrors.contactPerson = 'Name too short';
      else delete newErrors.contactPerson;
    }
    if (field === 'businessAddress') {
      if (value && value.trim().length < 10) newErrors.businessAddress = 'Address too short';
      else delete newErrors.businessAddress;
    }
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(formData)) {
      onSave(formData);
    } else {
      // Mark all fields as touched to show errors
      setTouched({
        name: true,
        type: true,
        registrationNumber: true,
        contactPerson: true,
        businessAddress: true,
      });
    }
  };

  return (
    <div className="bg-white border border-[var(--line-strong)] shadow-sm">
      <div className="p-4 border-b border-[var(--line)] flex justify-between items-center bg-gray-50">
        <h3 className="col-header flex items-center gap-2">
          <Building2 size={16} />
          {isEdit ? 'Edit Entity Configuration' : 'Create New Entity'}
        </h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
          <X size={20} />
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
              Entity Name
              {touched.name && errors.name && <span className="text-red-500 lowercase font-medium">{errors.name}</span>}
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Acme Corp"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => setTouched({ ...touched, name: true })}
              className={cn(
                "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none transition-colors",
                touched.name && errors.name ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
              )}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Entity Type</label>
            <select
              value={formData.type}
              onChange={(e) => handleChange('type', e.target.value)}
              className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none bg-white transition-colors"
            >
              <option value="Company">Company</option>
              <option value="Trust">Trust</option>
              <option value="Individual">Individual</option>
              <option value="US Big Law Firm">US Big Law Firm</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleChange('status' as keyof Entity, e.target.value)}
              className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none bg-white transition-colors"
            >
              <option value="Active">Active</option>
              <option value="Archived">Archived</option>
              <option value="Deactivated">Deactivated</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
              Registration Number (ABN/EIN)
              {touched.registrationNumber && errors.registrationNumber && <span className="text-red-500 lowercase font-medium">{errors.registrationNumber}</span>}
            </label>
            <input
              type="text"
              placeholder="e.g. ABN 12 345 678 901"
              value={formData.registrationNumber || ''}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              className={cn(
                "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors",
                touched.registrationNumber && errors.registrationNumber ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
              )}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
              Contact Person
              {touched.contactPerson && errors.contactPerson && <span className="text-red-500 lowercase font-medium">{errors.contactPerson}</span>}
            </label>
            <input
              type="text"
              placeholder="Full Name"
              value={formData.contactPerson || ''}
              onChange={(e) => handleChange('contactPerson', e.target.value)}
              onBlur={() => setTouched({ ...touched, contactPerson: true })}
              className={cn(
                "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none transition-colors",
                touched.contactPerson && errors.contactPerson ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
              )}
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
              Business Address
              {touched.businessAddress && errors.businessAddress && <span className="text-red-500 lowercase font-medium">{errors.businessAddress}</span>}
            </label>
            <textarea
              rows={2}
              value={formData.businessAddress || ''}
              onChange={(e) => handleChange('businessAddress', e.target.value)}
              onBlur={() => setTouched({ ...touched, businessAddress: true })}
              className={cn(
                "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none resize-none transition-colors",
                touched.businessAddress && errors.businessAddress ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
              )}
              placeholder="Street, Suburb, State, Postcode"
            />
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--line)] flex flex-col sm:flex-row justify-end gap-3">
          {Object.keys(errors).length > 0 && Object.values(touched).some(v => v) && (
            <div className="flex-1 flex items-center text-red-500 text-xs font-bold uppercase">
              Please correct errors before saving
            </div>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium border border-[var(--line)] hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-[var(--ink)] text-white px-6 py-2 text-sm font-medium flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            <Save size={16} />
            {isEdit ? 'Save Changes' : 'Create Entity'}
          </button>
        </div>
      </form>
    </div>
  );
};
