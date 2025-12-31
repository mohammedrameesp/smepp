'use client';

/**
 * @file ContactEmergencyStep.tsx
 * @description Step 2: Contact & Emergency Information
 * @module employee-onboarding/steps
 */

import { Phone, AlertTriangle } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PhoneInput, QatarPhoneInput } from '@/components/domains/hr/profile';
import { RELATIONSHIPS } from '@/lib/data/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ContactEmergencyStepProps {
  formData: Record<string, unknown>;
  updateField: (field: string, value: unknown) => void;
  errors: Record<string, string>;
  workEmail: string;
}

export function ContactEmergencyStep({ formData, updateField, errors, workEmail }: ContactEmergencyStepProps) {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <div className="h-16 w-16 rounded-2xl bg-green-100 flex items-center justify-center mx-auto mb-4">
          <Phone className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Contact & Emergency</h2>
        <p className="text-slate-600">
          Your contact details and emergency contacts.
        </p>
      </div>

      <div className="space-y-6">
        {/* Contact Information */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact Information</CardTitle>
            <CardDescription>Your phone and email details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Qatar Mobile <span className="text-red-500">*</span></Label>
                <QatarPhoneInput
                  value={(formData.qatarMobile as string) || ''}
                  onChange={(val) => updateField('qatarMobile', val)}
                  placeholder="12345678"
                  error={errors.qatarMobile}
                />
              </div>

              <div className="space-y-2">
                <Label>Other Mobile</Label>
                <PhoneInput
                  codeValue={(formData.otherMobileCode as string) || '+91'}
                  numberValue={(formData.otherMobileNumber as string) || ''}
                  onCodeChange={(val) => updateField('otherMobileCode', val)}
                  onNumberChange={(val) => updateField('otherMobileNumber', val)}
                  numberPlaceholder="Phone number"
                  error={errors.otherMobileNumber}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="personalEmail">Personal Email</Label>
                <Input
                  id="personalEmail"
                  type="email"
                  value={(formData.personalEmail as string) || ''}
                  onChange={(e) => updateField('personalEmail', e.target.value)}
                  placeholder="personal@email.com"
                  className={errors.personalEmail ? 'border-red-500' : ''}
                />
                {errors.personalEmail && (
                  <p className="text-sm text-red-600">{errors.personalEmail}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Work Email</Label>
                <Input value={workEmail} disabled className="bg-slate-50" />
                <p className="text-xs text-slate-500">From your login</p>
              </div>
            </div>

            {/* Qatar Address */}
            <div className="pt-2">
              <Label className="text-sm text-slate-700 mb-2 block">Qatar Address</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Zone</Label>
                  <Input
                    value={(formData.qatarZone as string) || ''}
                    onChange={(e) => updateField('qatarZone', e.target.value)}
                    placeholder="45"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Street</Label>
                  <Input
                    value={(formData.qatarStreet as string) || ''}
                    onChange={(e) => updateField('qatarStreet', e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Building</Label>
                  <Input
                    value={(formData.qatarBuilding as string) || ''}
                    onChange={(e) => updateField('qatarBuilding', e.target.value)}
                    placeholder="15"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Unit</Label>
                  <Input
                    value={(formData.qatarUnit as string) || ''}
                    onChange={(e) => updateField('qatarUnit', e.target.value)}
                    placeholder="5A"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Home Country Address</Label>
              <Textarea
                value={(formData.homeCountryAddress as string) || ''}
                onChange={(e) => updateField('homeCountryAddress', e.target.value)}
                placeholder="Full address in home country"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Emergency Contacts */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <CardTitle className="text-base">Emergency Contacts</CardTitle>
            </div>
            <CardDescription>Required: both local and home country contacts</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Local Emergency */}
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-slate-700">
                Local (Qatar) Contact <span className="text-red-500">*</span>
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={(formData.localEmergencyName as string) || ''}
                    onChange={(e) => updateField('localEmergencyName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select
                    value={(formData.localEmergencyRelation as string) || ''}
                    onValueChange={(val) => updateField('localEmergencyRelation', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <PhoneInput
                    codeValue={(formData.localEmergencyPhoneCode as string) || '+974'}
                    numberValue={(formData.localEmergencyPhone as string) || ''}
                    onCodeChange={(val) => updateField('localEmergencyPhoneCode', val)}
                    onNumberChange={(val) => updateField('localEmergencyPhone', val)}
                    error={errors.localEmergencyPhone}
                  />
                </div>
              </div>
            </div>

            {/* Home Country Emergency */}
            <div className="space-y-3 pt-3 border-t">
              <h4 className="text-sm font-semibold text-slate-700">
                Home Country Contact <span className="text-red-500">*</span>
              </h4>
              <div className="grid sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={(formData.homeEmergencyName as string) || ''}
                    onChange={(e) => updateField('homeEmergencyName', e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Relationship</Label>
                  <Select
                    value={(formData.homeEmergencyRelation as string) || ''}
                    onValueChange={(val) => updateField('homeEmergencyRelation', val)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {RELATIONSHIPS.map((r) => (
                        <SelectItem key={r} value={r}>{r}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <PhoneInput
                    codeValue={(formData.homeEmergencyPhoneCode as string) || '+91'}
                    numberValue={(formData.homeEmergencyPhone as string) || ''}
                    onCodeChange={(val) => updateField('homeEmergencyPhoneCode', val)}
                    onNumberChange={(val) => updateField('homeEmergencyPhone', val)}
                    error={errors.homeEmergencyPhone}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
