'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/core/utils';
import type { ValidationRule } from '@/lib/help/help-types';

interface HelpValidationTableProps {
  rules: ValidationRule[];
  title?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function HelpValidationTable({
  rules,
  title = 'Field Validations',
  collapsible = false,
  defaultOpen = true,
}: HelpValidationTableProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (rules.length === 0) {
    return null;
  }

  const content = (
    <div className="overflow-hidden rounded-lg border bg-white">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Field
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Validation Rule
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
              Example
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {rules.map((rule, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-3 whitespace-nowrap">
                <div className="flex items-center gap-2">
                  {rule.required && (
                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-red-500" title="Required" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{rule.field}</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className="text-sm text-gray-600">{rule.rule}</span>
              </td>
              <td className="px-4 py-3 hidden md:table-cell">
                {rule.example ? (
                  <code className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                    {rule.example}
                  </code>
                ) : (
                  <span className="text-gray-400 text-sm">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 flex items-center gap-4">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
          Required field
        </span>
      </div>
    </div>
  );

  if (!collapsible) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>
        {content}
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">{rules.length} rules</span>
          <ChevronDown
            className={cn(
              'h-5 w-5 text-gray-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
          />
        </div>
      </button>

      <div
        className={cn(
          'transition-all duration-200 overflow-hidden',
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="border-t">
          {content}
        </div>
      </div>
    </div>
  );
}
