/**
 * @file employee-hr-view.tsx
 * @description HR profile view section for employee details page, displaying comprehensive employee information
 * @module components/domains/hr
 */
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/date-format';
import { parseJsonArray, getExpiryStatus } from '@/lib/hr-utils';
import { ExpiryDateDisplay, DocumentLink } from '@/components/hr';
import {
  User,
  Phone,
  CreditCard,
  Briefcase,
  Building2,
  GraduationCap,
  Info,
  AlertTriangle,
  FileText,
} from 'lucide-react';

interface HRProfile {
  id: string;
  userId: string;
  dateOfBirth: Date | null;
  gender: string | null;
  maritalStatus: string | null;
  nationality: string | null;
  qatarMobile: string | null;
  otherMobileCode: string | null;
  otherMobileNumber: string | null;
  personalEmail: string | null;
  qatarZone: string | null;
  qatarStreet: string | null;
  qatarBuilding: string | null;
  qatarUnit: string | null;
  homeCountryAddress: string | null;
  localEmergencyName: string | null;
  localEmergencyRelation: string | null;
  localEmergencyPhoneCode: string | null;
  localEmergencyPhone: string | null;
  homeEmergencyName: string | null;
  homeEmergencyRelation: string | null;
  homeEmergencyPhoneCode: string | null;
  homeEmergencyPhone: string | null;
  qidNumber: string | null;
  qidExpiry: Date | null;
  passportNumber: string | null;
  passportExpiry: Date | null;
  healthCardExpiry: Date | null;
  sponsorshipType: string | null;
  employeeId: string | null;
  designation: string | null;
  dateOfJoining: Date | null;
  bankName: string | null;
  iban: string | null;
  highestQualification: string | null;
  specialization: string | null;
  institutionName: string | null;
  graduationYear: number | null;
  qidUrl: string | null;
  passportCopyUrl: string | null;
  photoUrl: string | null;
  contractCopyUrl: string | null;
  hasDrivingLicense: boolean;
  licenseExpiry: Date | null;
  languagesKnown: string | null;
  skillsCertifications: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface Employee {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

interface EmployeeHRViewSectionProps {
  hrProfile: HRProfile | null;
  employee: Employee;
}

function InfoRow({ label, value, highlight = false }: { label: string; value: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`py-2 ${highlight ? 'bg-yellow-50 px-2 rounded' : ''}`}>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value || <span className="text-gray-400">Not provided</span>}</dd>
    </div>
  );
}

export function EmployeeHRViewSection({ hrProfile: hr, employee }: EmployeeHRViewSectionProps) {
  if (!hr) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-gray-500">
            <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium">No Profile</p>
            <p className="text-sm">Profile has not been created for this employee yet.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const qatarAddress = [
    hr.qatarZone && `Zone ${hr.qatarZone}`,
    hr.qatarStreet && `Street ${hr.qatarStreet}`,
    hr.qatarBuilding && `Building ${hr.qatarBuilding}`,
    hr.qatarUnit && `Unit ${hr.qatarUnit}`,
  ]
    .filter(Boolean)
    .join(', ');

  const languages = parseJsonArray(hr.languagesKnown);
  const skills = parseJsonArray(hr.skillsCertifications);

  return (
    <div className="space-y-6">
      {/* Personal Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>Basic personal details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-4 gap-4">
            <InfoRow label="Date of Birth" value={hr.dateOfBirth ? formatDate(hr.dateOfBirth) : null} />
            <InfoRow label="Gender" value={hr.gender} />
            <InfoRow label="Marital Status" value={hr.maritalStatus} />
            <InfoRow label="Nationality" value={hr.nationality} />
          </dl>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>Phone numbers and addresses</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-2 gap-4">
            <InfoRow label="Qatar Mobile" value={hr.qatarMobile ? `+974 ${hr.qatarMobile}` : null} />
            <InfoRow
              label="Other Mobile"
              value={
                hr.otherMobileNumber
                  ? `${hr.otherMobileCode || ''} ${hr.otherMobileNumber}`
                  : null
              }
            />
            <InfoRow label="Personal Email" value={hr.personalEmail} />
            <InfoRow label="Work Email" value={employee.email} />
            <InfoRow label="Qatar Address" value={qatarAddress || null} />
            <InfoRow label="Home Country Address" value={hr.homeCountryAddress} />
          </dl>
        </CardContent>
      </Card>

      {/* Emergency Contacts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Emergency Contacts</CardTitle>
              <CardDescription>Local and home country contacts</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Local Emergency Contact (Qatar)</h4>
              <dl className="space-y-2">
                <InfoRow label="Contact Name" value={hr.localEmergencyName} />
                <InfoRow label="Relationship" value={hr.localEmergencyRelation} />
                <InfoRow
                  label="Phone"
                  value={
                    hr.localEmergencyPhone
                      ? `${hr.localEmergencyPhoneCode || '+974'} ${hr.localEmergencyPhone}`
                      : null
                  }
                />
              </dl>
            </div>
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Home Country Emergency Contact</h4>
              <dl className="space-y-2">
                <InfoRow label="Contact Name" value={hr.homeEmergencyName} />
                <InfoRow label="Relationship" value={hr.homeEmergencyRelation} />
                <InfoRow
                  label="Phone"
                  value={
                    hr.homeEmergencyPhone
                      ? `${hr.homeEmergencyPhoneCode || ''} ${hr.homeEmergencyPhone}`
                      : null
                  }
                />
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Identification & Legal */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Identification & Legal</CardTitle>
              <CardDescription>QID, passport, and visa details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Qatar ID (QID)</h4>
              <dl className="grid md:grid-cols-2 gap-4">
                <InfoRow label="QID Number" value={hr.qidNumber} />
                <InfoRow
                  label="Expiry Date"
                  value={<ExpiryDateDisplay date={hr.qidExpiry} />}
                  highlight={getExpiryStatus(hr.qidExpiry) === 'expired' || getExpiryStatus(hr.qidExpiry) === 'expiring'}
                />
              </dl>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-3">Passport</h4>
              <dl className="grid md:grid-cols-2 gap-4">
                <InfoRow label="Passport Number" value={hr.passportNumber} />
                <InfoRow
                  label="Expiry Date"
                  value={<ExpiryDateDisplay date={hr.passportExpiry} />}
                  highlight={getExpiryStatus(hr.passportExpiry) === 'expired' || getExpiryStatus(hr.passportExpiry) === 'expiring'}
                />
              </dl>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-3">Health Card</h4>
              <dl>
                <InfoRow
                  label="Expiry Date"
                  value={<ExpiryDateDisplay date={hr.healthCardExpiry} />}
                  highlight={getExpiryStatus(hr.healthCardExpiry) === 'expired' || getExpiryStatus(hr.healthCardExpiry) === 'expiring'}
                />
              </dl>
            </div>

            <div>
              <h4 className="font-medium text-gray-700 mb-3">Sponsorship</h4>
              <dl>
                <InfoRow label="Sponsorship Type" value={hr.sponsorshipType} />
              </dl>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Employment Information</CardTitle>
              <CardDescription>Job details</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-3 gap-4">
            <InfoRow label="Employee ID" value={hr.employeeId} />
            <InfoRow label="Designation" value={hr.designation} />
            <InfoRow label="Date of Joining" value={hr.dateOfJoining ? formatDate(hr.dateOfJoining) : null} />
          </dl>
        </CardContent>
      </Card>

      {/* Bank & Payroll */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Bank & Payroll</CardTitle>
              <CardDescription>Banking details for salary</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-2 gap-4">
            <InfoRow label="Bank Name" value={hr.bankName} />
            <InfoRow label="IBAN" value={hr.iban} />
          </dl>
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Education</CardTitle>
              <CardDescription>Qualifications and academic background</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-2 gap-4">
            <InfoRow label="Highest Qualification" value={hr.highestQualification} />
            <InfoRow label="Specialization" value={hr.specialization} />
            <InfoRow label="Institution" value={hr.institutionName} />
            <InfoRow label="Year of Graduation" value={hr.graduationYear?.toString()} />
          </dl>
        </CardContent>
      </Card>

      {/* Documents */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Documents</CardTitle>
              <CardDescription>Uploaded documents</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid md:grid-cols-3 gap-4">
            <InfoRow label="QID Copy" value={<DocumentLink url={hr.qidUrl} label="View Document" />} />
            <InfoRow label="Passport Copy" value={<DocumentLink url={hr.passportCopyUrl} label="View Document" />} />
            <InfoRow label="Photo" value={<DocumentLink url={hr.photoUrl} label="View Photo" />} />
            {/* Contract hidden for now - will be added later
            <InfoRow label="Contract Copy" value={<DocumentLink url={hr.contractCopyUrl} label="View Contract" />} />
            */}
          </dl>
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-gray-500" />
            <div>
              <CardTitle>Additional Information</CardTitle>
              <CardDescription>Driving license, languages, and skills</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Driving License */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Driving License</h4>
              {hr.hasDrivingLicense ? (
                <dl>
                  <InfoRow
                    label="Expiry Date"
                    value={<ExpiryDateDisplay date={hr.licenseExpiry} />}
                    highlight={getExpiryStatus(hr.licenseExpiry) === 'expired' || getExpiryStatus(hr.licenseExpiry) === 'expiring'}
                  />
                </dl>
              ) : (
                <p className="text-gray-500 text-sm">No driving license</p>
              )}
            </div>

            {/* Languages */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Languages Known</h4>
              {languages.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {languages.map((lang) => (
                    <Badge key={lang} variant="secondary">
                      {lang}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Not provided</p>
              )}
            </div>

            {/* Skills & Certifications */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Skills & Certifications</h4>
              {skills.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skills.map((skill) => (
                    <Badge key={skill} variant="outline">
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm">Not provided</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
