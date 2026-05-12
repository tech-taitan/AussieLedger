/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Entity } from '../types';
import { Save, X, Building2, UserCheck, AlertTriangle, Trash2 } from 'lucide-react';
import { validateAbn } from '../lib/validation';
import { cn } from '../lib/utils';
import { BeneficiaryRegister } from './BeneficiaryRegister';
import { PartnerRegister } from './PartnerRegister';

interface EntityFormProps {
  entity?: Entity;
  onSave: (entity: Entity) => void;
  onCancel: () => void;
  // Phase 4 additions (all optional — preserves Phase 2 contract)
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
  /** Number of journal entries currently referencing this entity. >0 triggers
   *  the block-or-archive dialog (ENT-06 deletion policy). */
  inUseCount?: number;
}

export const EntityForm: React.FC<EntityFormProps> = ({
  entity,
  onSave,
  onCancel,
  onDelete,
  onArchive,
  inUseCount,
}) => {
  const isEdit = !!entity;
  const [formData, setFormData] = useState<Entity>(
    entity || {
      id: `ent-${Math.random().toString(36).substr(2, 9)}`,
      name: '',
      type: 'Company',
      registrationNumber: '',
      businessAddress: '',
      contactPerson: '',
      status: 'Active',
      taxAgentName: '',
      taxAgentPhone: '',
      taxAgentEmail: '',
      notes: '',
      // Phase 4 v3 defaults
      gstRegistered: false,
      accountingMethod: 'accruals',
      fyEndDate: '06-30',
    },
  );

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});

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

    if (data.contactPerson && data.contactPerson.trim().length < 2) {
      newErrors.contactPerson = 'Contact name too short';
    }

    if (data.businessAddress && data.businessAddress.trim().length < 10) {
      newErrors.businessAddress = 'Enter a complete address';
    }

    if (data.taxAgentEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.taxAgentEmail)) {
      newErrors.taxAgentEmail = 'Invalid email format';
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
      const newWarnings = { ...warnings };
      delete newErrors.registrationNumber; // never block on registrationNumber
      if (value && value.trim().length > 0) {
        const digits = value.replace(/[^0-9]/g, '');
        if (digits.length === 11) {
          const result = validateAbn(value);
          if (!result.valid) {
            newWarnings.registrationNumber =
              result.reason ?? 'ABN checksum invalid — please check the number';
          } else {
            delete newWarnings.registrationNumber;
          }
        } else {
          delete newWarnings.registrationNumber;
        }
      } else {
        delete newWarnings.registrationNumber;
      }
      setWarnings(newWarnings);
    }
    if (field === 'contactPerson') {
      if (value && value.trim().length < 2) newErrors.contactPerson = 'Name too short';
      else delete newErrors.contactPerson;
    }
    if (field === 'businessAddress') {
      if (value && value.trim().length < 10) newErrors.businessAddress = 'Address too short';
      else delete newErrors.businessAddress;
    }
    if (field === 'taxAgentEmail') {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) newErrors.taxAgentEmail = 'Invalid email';
      else delete newErrors.taxAgentEmail;
    }
    setErrors(newErrors);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate(formData)) {
      onSave(formData);
    } else {
      setTouched({
        name: true,
        type: true,
        registrationNumber: true,
        contactPerson: true,
        businessAddress: true,
        taxAgentName: true,
        taxAgentPhone: true,
        taxAgentEmail: true,
      });
    }
  };

  // Phase 4 — block-or-archive deletion (ENT-06). Mirrors AccountManager's
  // archive-vs-delete policy: if any journals reference the entity, block hard
  // delete and offer Archive instead.
  const handleDeleteClick = () => {
    if (!onDelete) return;
    if ((inUseCount ?? 0) > 0) {
      if (
        confirm(
          `Cannot delete — ${inUseCount} journals reference this entity. Archive instead?`,
        )
      ) {
        onArchive?.(formData.id);
      }
    } else {
      if (confirm('Delete this entity? This cannot be undone.')) {
        onDelete(formData.id);
      }
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
              aria-label="entity-type-select"
              className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none bg-white transition-colors"
            >
              {/* Phase 4 — AU four entity types only (ENT-01). */}
              <option value="Company">Company (Pty Ltd)</option>
              <option value="Trust">Trust</option>
              <option value="Individual">Individual / Sole Trader</option>
              <option value="Partnership">Partnership</option>
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
            <label htmlFor="entity-abn" className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
              <span>ABN</span>
              {warnings.registrationNumber && (
                <span className="text-amber-600 lowercase font-medium flex items-center gap-1">
                  <AlertTriangle size={12} aria-hidden="true" />
                  {warnings.registrationNumber}
                </span>
              )}
            </label>
            <input
              id="entity-abn"
              type="text"
              aria-label="ABN"
              placeholder="e.g. 51 824 753 556"
              value={formData.registrationNumber || ''}
              onChange={(e) => handleChange('registrationNumber', e.target.value)}
              className={cn(
                "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none font-mono transition-colors",
                warnings.registrationNumber ? "border-amber-400 bg-amber-50" : "focus:border-[var(--ink)]"
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

        {/* Phase 4 — v3 AU-specific fields (ENT-03/04/05). */}
        <div className="pt-6 border-t border-[var(--line)]">
          <h4 className="text-sm font-bold uppercase text-[var(--ink)] mb-4">
            AU compliance settings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.gstRegistered ?? false}
                onChange={(e) =>
                  setFormData({ ...formData, gstRegistered: e.target.checked })
                }
                aria-label="GST registered"
              />
              <span className="text-sm">GST registered</span>
            </label>

            <fieldset>
              <legend className="text-xs font-bold uppercase text-gray-500 tracking-wider mb-2">
                Accounting method
              </legend>
              <label className="flex items-center gap-2 mb-1">
                <input
                  type="radio"
                  name="accountingMethod"
                  value="cash"
                  checked={(formData.accountingMethod ?? 'accruals') === 'cash'}
                  onChange={() =>
                    setFormData({ ...formData, accountingMethod: 'cash' })
                  }
                  aria-label="accounting-method-cash"
                />
                <span className="text-sm">Cash</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="accountingMethod"
                  value="accruals"
                  checked={(formData.accountingMethod ?? 'accruals') === 'accruals'}
                  onChange={() =>
                    setFormData({ ...formData, accountingMethod: 'accruals' })
                  }
                  aria-label="accounting-method-accruals"
                />
                <span className="text-sm">Accruals</span>
              </label>
            </fieldset>

            <div className="space-y-2">
              <label
                htmlFor="entity-fy-end"
                className="text-xs font-bold uppercase text-gray-500 tracking-wider"
              >
                Financial year end (MM-DD)
              </label>
              <input
                id="entity-fy-end"
                type="text"
                value={formData.fyEndDate ?? '06-30'}
                onChange={(e) =>
                  setFormData({ ...formData, fyEndDate: e.target.value })
                }
                aria-label="fy-end-date"
                placeholder="06-30"
                pattern="\d{2}-\d{2}"
                className="border border-[var(--line)] rounded px-2 py-1 text-sm w-32 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Phase 4 — Trust beneficiary register (ENT-07). */}
        {formData.type === 'Trust' && (
          <div className="pt-6 border-t border-[var(--line)]">
            <BeneficiaryRegister
              rows={formData.beneficiaries ?? []}
              onChange={(rows) =>
                setFormData({ ...formData, beneficiaries: rows })
              }
            />
          </div>
        )}

        {/* Phase 4 — Partnership partner register (ENT-08). */}
        {formData.type === 'Partnership' && (
          <div className="pt-6 border-t border-[var(--line)]">
            <PartnerRegister
              rows={formData.partners ?? []}
              onChange={(rows) =>
                setFormData({ ...formData, partners: rows })
              }
            />
          </div>
        )}

        <div className="pt-6 border-t border-[var(--line)]">
          <h4 className="text-sm font-bold uppercase text-[var(--ink)] mb-4 flex items-center gap-2">
            <UserCheck size={16} />
            Tax Agent Details
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Agent Name</label>
              <input
                type="text"
                placeholder="Agent Full Name"
                value={formData.taxAgentName || ''}
                onChange={(e) => handleChange('taxAgentName' as keyof Entity, e.target.value)}
                className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider">Contact Number</label>
              <input
                type="text"
                placeholder="e.g. 0400 000 000"
                value={formData.taxAgentPhone || ''}
                onChange={(e) => handleChange('taxAgentPhone' as keyof Entity, e.target.value)}
                className="w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none transition-colors"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase text-gray-500 tracking-wider flex justify-between">
                Email Address
                {touched.taxAgentEmail && errors.taxAgentEmail && <span className="text-red-500 lowercase font-medium">{errors.taxAgentEmail}</span>}
              </label>
              <input
                type="email"
                placeholder="agent@example.com"
                value={formData.taxAgentEmail || ''}
                onChange={(e) => handleChange('taxAgentEmail' as keyof Entity, e.target.value)}
                onBlur={() => setTouched({ ...touched, taxAgentEmail: true })}
                className={cn(
                  "w-full p-2 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none transition-colors",
                  touched.taxAgentEmail && errors.taxAgentEmail ? "border-red-500 bg-red-50" : "focus:border-[var(--ink)]"
                )}
              />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-[var(--line)]">
          <label className="text-xs font-bold uppercase text-gray-500 tracking-wider block mb-2">Entity Notes</label>
          <textarea
            rows={4}
            value={formData.notes || ''}
            onChange={(e) => handleChange('notes' as keyof Entity, e.target.value)}
            className="w-full p-3 border border-[var(--line)] focus:ring-1 focus:ring-[var(--ink)] outline-none resize-none bg-gray-50/30 transition-colors"
            placeholder="Add internal notes about this entity, specific handling instructions, or historical context..."
          />
        </div>

        <div className="pt-6 border-t border-[var(--line)] flex flex-col sm:flex-row justify-end gap-3 items-center">
          {/* Phase 4 — block-or-archive delete (ENT-06) on existing entities only. */}
          {isEdit && onDelete && (
            <button
              type="button"
              onClick={handleDeleteClick}
              className="text-red-600 text-sm flex items-center gap-1 mr-auto hover:underline"
              data-testid="entity-delete-btn"
            >
              <Trash2 size={14} /> Delete entity
            </button>
          )}
          {Object.keys(errors).length > 0 && Object.values(touched).some((v) => v) && (
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
