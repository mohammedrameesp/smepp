/**
 * @file code-format-settings.tsx
 * @description Settings component for customizing reference code formats for employees, assets, and other entities
 * @module components/domains/system/settings
 */
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Hash,
  Loader2,
  Save,
  RotateCcw,
  Info,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  type EntityType,
  type CodeFormatConfig,
  DEFAULT_FORMATS,
  ENTITY_LABELS,
  ENTITY_TO_MODULE,
  FORMAT_TOKENS,
  generateFormatPreview,
  validateFormatPattern,
} from '@/lib/utils/code-prefix';

interface CodeFormatSettingsProps {
  organizationId: string;
  codePrefix: string;
  initialFormats?: CodeFormatConfig;
  enabledModules?: string[];
}

export function CodeFormatSettings({
  organizationId,
  codePrefix,
  initialFormats = {},
  enabledModules,
}: CodeFormatSettingsProps) {
  const [formats, setFormats] = useState<CodeFormatConfig>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize formats with defaults merged with saved values
  useEffect(() => {
    const merged: CodeFormatConfig = {};
    (Object.keys(DEFAULT_FORMATS) as EntityType[]).forEach((key) => {
      merged[key] = initialFormats[key] || DEFAULT_FORMATS[key];
    });
    setFormats(merged);
  }, [initialFormats]);

  const handleFormatChange = (entityType: EntityType, value: string) => {
    setFormats((prev) => ({ ...prev, [entityType]: value }));
    setSaved(false);
  };

  const handleReset = (entityType: EntityType) => {
    setFormats((prev) => ({ ...prev, [entityType]: DEFAULT_FORMATS[entityType] }));
    setSaved(false);
  };

  const handleResetAll = () => {
    setFormats({ ...DEFAULT_FORMATS });
    setSaved(false);
  };

  const handleSave = async () => {
    // Validate all formats
    for (const [key, pattern] of Object.entries(formats)) {
      if (pattern) {
        const validation = validateFormatPattern(pattern);
        if (!validation.valid) {
          setError(`${ENTITY_LABELS[key as EntityType]}: ${validation.error}`);
          return;
        }
      }
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`/api/organizations/${organizationId}/code-formats`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formats }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to save code formats');
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const getPreview = (pattern: string) => {
    try {
      return generateFormatPreview(pattern, codePrefix);
    } catch {
      return 'Invalid format';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Hash className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle>Reference Code Formats</CardTitle>
              <CardDescription>
                Customize the format for employee IDs, asset tags, and other reference codes
              </CardDescription>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleResetAll}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset All
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : saved ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Saved
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Token Reference */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="h-4 w-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">Available Tokens</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {FORMAT_TOKENS.map((token) => (
              <Badge
                key={token.token}
                variant="outline"
                className="font-mono text-xs bg-white"
                title={`${token.description} (e.g., ${token.example})`}
              >
                {token.token}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            Hover over tokens to see examples. You can also use static text like &quot;EMP&quot;, &quot;PR&quot;, &quot;-&quot;, etc.
          </p>
        </div>

        {/* Format Editors */}
        <div className="grid gap-4">
          {(Object.keys(DEFAULT_FORMATS) as EntityType[])
            .filter((entityType) => {
              // If no enabledModules provided, show all
              if (!enabledModules || enabledModules.length === 0) return true;
              return enabledModules.includes(ENTITY_TO_MODULE[entityType]);
            })
            .map((entityType) => {
            const pattern = formats[entityType] || DEFAULT_FORMATS[entityType];
            const preview = getPreview(pattern);
            const isDefault = pattern === DEFAULT_FORMATS[entityType];

            return (
              <div
                key={entityType}
                className="grid grid-cols-1 md:grid-cols-[200px_1fr_200px_auto] gap-3 items-center p-4 border rounded-lg"
              >
                <div>
                  <Label className="font-medium">{ENTITY_LABELS[entityType]}</Label>
                  {!isDefault && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      Custom
                    </Badge>
                  )}
                </div>

                <Input
                  value={pattern}
                  onChange={(e) => handleFormatChange(entityType, e.target.value)}
                  className="font-mono text-sm"
                  placeholder={DEFAULT_FORMATS[entityType]}
                />

                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500">Preview:</span>
                  <code className="px-2 py-1 bg-slate-100 rounded text-sm font-mono">
                    {preview}
                  </code>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReset(entityType)}
                  disabled={isDefault}
                  className="text-slate-500"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>

        {/* Current Prefix Display */}
        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
          <div>
            <p className="text-sm font-medium text-blue-900">Current Code Prefix</p>
            <p className="text-xs text-blue-700">
              This prefix is used for {'{PREFIX}'} in all formats
            </p>
          </div>
          <code className="px-3 py-1.5 bg-blue-100 text-blue-800 rounded font-mono text-lg font-bold">
            {codePrefix}
          </code>
        </div>
      </CardContent>
    </Card>
  );
}
