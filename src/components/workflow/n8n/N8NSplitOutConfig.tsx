import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { X, ChevronDown, Info, Sparkles } from 'lucide-react';
import { N8NNodeIOPanel } from './N8NNodeIOPanel';
import { SplitOutIcon } from './BrandIcons';
import { toast } from '@/hooks/use-toast';

interface SplitOutConfig {
  // Source field containing the array to split
  sourceField: string;
  // Include index in each item
  includeIndex: boolean;
  // Include total count in each item
  includeTotal: boolean;
  // Field name for the current item
  itemFieldName: string;
  // Custom field mappings for output
  fieldMappings: Array<{
    sourceField: string;
    targetField: string;
  }>;
}

interface NodeData {
  nodeName: string;
  nodeIcon?: string;
  data: any;
  itemCount?: number;
}

interface N8NSplitOutConfigProps {
  node: {
    id: string;
    type: string;
    label: string;
    icon: string;
    description?: string;
    config?: SplitOutConfig;
  };
  onClose: () => void;
  onSave: (config: SplitOutConfig) => void;
  inputData?: any;
  outputData?: any;
  previousNodeLabel?: string;
  nodeSources?: NodeData[];
}

export const N8NSplitOutConfig: React.FC<N8NSplitOutConfigProps> = ({
  node,
  onClose,
  onSave,
  inputData,
  outputData,
  nodeSources,
}) => {
  const [activeTab, setActiveTab] = useState<'parameters' | 'settings'>('parameters');
  const [isFieldDropdownOpen, setIsFieldDropdownOpen] = useState(false);

  const [config, setConfig] = useState<SplitOutConfig>({
    sourceField: node.config?.sourceField || 'data',
    includeIndex: node.config?.includeIndex !== false,
    includeTotal: node.config?.includeTotal !== false,
    itemFieldName: node.config?.itemFieldName || 'item',
    fieldMappings: node.config?.fieldMappings || [],
  });

  // Detect available array fields from input data
  const [availableFields, setAvailableFields] = useState<string[]>([]);

  useEffect(() => {
    if (inputData) {
      const fields: string[] = [];
      const findArrayFields = (obj: any, prefix: string = '') => {
        if (Array.isArray(obj)) {
          fields.push(prefix || 'root');
        } else if (obj && typeof obj === 'object') {
          Object.keys(obj).forEach(key => {
            const newPrefix = prefix ? `${prefix}.${key}` : key;
            if (Array.isArray(obj[key])) {
              fields.push(newPrefix);
            } else if (typeof obj[key] === 'object') {
              findArrayFields(obj[key], newPrefix);
            }
          });
        }
      };
      findArrayFields(inputData);
      setAvailableFields(fields);

      // Auto-select first array field if none selected
      if (!config.sourceField && fields.length > 0) {
        setConfig(prev => ({ ...prev, sourceField: fields[0] }));
      }
    }
  }, [inputData]);

  // Get sample item from input array
  const getSampleItem = () => {
    if (!inputData || !config.sourceField) return null;

    try {
      let arrayData = inputData;
      if (config.sourceField !== 'root') {
        const parts = config.sourceField.split('.');
        for (const part of parts) {
          arrayData = arrayData[part];
        }
      }
      if (Array.isArray(arrayData) && arrayData.length > 0) {
        return arrayData[0];
      }
    } catch {
      return null;
    }
    return null;
  };

  const sampleItem = getSampleItem();

  // Calculate preview output (simulated split)
  const getPreviewOutput = () => {
    if (!inputData || !config.sourceField) return null;

    try {
      let arrayData = inputData;
      if (config.sourceField !== 'root') {
        const parts = config.sourceField.split('.');
        for (const part of parts) {
          arrayData = arrayData[part];
        }
      }

      if (!Array.isArray(arrayData)) return null;

      // Return first 3 items as preview with index/total if enabled
      const preview = arrayData.slice(0, 3).map((item, index) => {
        const result: any = { [config.itemFieldName]: item };
        if (config.includeIndex) {
          result._index = index;
        }
        if (config.includeTotal) {
          result._total = arrayData.length;
        }
        return result;
      });

      return {
        items: preview,
        totalItems: arrayData.length,
        showing: Math.min(3, arrayData.length),
      };
    } catch {
      return null;
    }
  };

  const previewOutput = getPreviewOutput();

  const handleSave = () => {
    onSave(config);
    // Don't close - allow user to continue editing
    toast({
      title: "Salvat",
      description: "Configurația a fost salvată cu succes",
    });
  };

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center"
      style={{
        backgroundColor: '#131419',
        backgroundImage: 'radial-gradient(#2a2a2a 1px, transparent 1px)',
        backgroundSize: '20px 20px',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="flex items-stretch" style={{ height: '85vh', maxWidth: '98vw', width: '95%' }}>
        {/* INPUT Panel - Left (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopLeftRadius: '8px',
            borderBottomLeftRadius: '8px',
            borderRight: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="INPUT"
              data={inputData}
              enableDrag={true}
              nodeSources={nodeSources}
            />
          </div>
        </div>

        {/* Main Config Panel - Center */}
        <div
          className="flex flex-col overflow-hidden flex-shrink-0"
          style={{
            width: '600px',
            backgroundColor: '#2b2b2b',
            boxShadow: '0 0 60px rgba(0, 0, 0, 0.8)',
            borderRadius: '8px',
            zIndex: 5,
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ backgroundColor: '#2a2a2a', borderBottom: '1px solid #333' }}
          >
            <div className="flex items-center gap-3">
              <SplitOutIcon size={28} />
              <span style={{ color: '#d0d0d0', fontSize: '14px', fontWeight: 600 }}>
                Split Out
              </span>
            </div>
            <button
              onClick={handleSave}
              className="p-1 hover:bg-[#333] rounded transition-colors"
            >
              <X className="w-4 h-4" style={{ color: '#888' }} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: '#333', backgroundColor: '#222' }}>
            {['parameters', 'settings'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className="flex-1 px-4 py-2 text-xs font-medium transition-colors"
                style={{
                  color: activeTab === tab ? '#fff' : '#888',
                  borderBottom: activeTab === tab ? '2px solid #60a5fa' : '2px solid transparent',
                }}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto" style={{ backgroundColor: '#1a1a1a' }}>
            {activeTab === 'parameters' && (
              <div className="p-4 space-y-4">
                {/* Info Banner */}
                <div className="rounded-lg p-3" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
                  <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 mt-0.5" style={{ color: '#60a5fa' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#cbd5e1' }}>
                        Cum funcționează Split Out?
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                        Acest nod primește un array și îl împarte în items individuale.
                        Fiecare item va fi procesat separat de nodurile următoare.
                        <br /><br />
                        <strong>Exemplu:</strong> 100 anunțuri din 999.md → 100 leads individuale în AmoCRM
                      </p>
                    </div>
                  </div>
                </div>

                {/* Source Field Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#fff' }}>
                    Câmpul cu Array
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setIsFieldDropdownOpen(!isFieldDropdownOpen)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm"
                      style={{
                        backgroundColor: '#252525',
                        border: '1px solid #333',
                        color: '#fff',
                      }}
                    >
                      <span className="font-mono text-xs">{config.sourceField || 'Selectează câmpul...'}</span>
                      <ChevronDown className="w-4 h-4" style={{ color: '#888' }} />
                    </button>

                    {isFieldDropdownOpen && (
                      <div
                        className="absolute top-full left-0 right-0 mt-1 rounded-lg overflow-hidden"
                        style={{
                          backgroundColor: '#252525',
                          border: '1px solid #333',
                          zIndex: 10,
                        }}
                      >
                        {availableFields.length > 0 ? (
                          availableFields.map((field) => (
                            <button
                              key={field}
                              onClick={() => {
                                setConfig(prev => ({ ...prev, sourceField: field }));
                                setIsFieldDropdownOpen(false);
                              }}
                              className="w-full text-left px-3 py-2 text-xs font-mono hover:bg-[#333] transition-colors"
                              style={{ color: config.sourceField === field ? '#60a5fa' : '#fff' }}
                            >
                              {field}
                            </button>
                          ))
                        ) : (
                          <div className="px-3 py-2 text-xs" style={{ color: '#888' }}>
                            Nu s-au detectat câmpuri array în input
                          </div>
                        )}
                        <div
                          className="px-3 py-2 border-t"
                          style={{ borderColor: '#333' }}
                        >
                          <input
                            type="text"
                            placeholder="Sau introdu manual..."
                            value={config.sourceField}
                            onChange={(e) => setConfig(prev => ({ ...prev, sourceField: e.target.value }))}
                            className="w-full bg-transparent text-xs font-mono outline-none"
                            style={{ color: '#fff' }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  <p className="text-xs" style={{ color: '#888' }}>
                    Câmpul din input care conține array-ul de procesat (ex: data, items, results)
                  </p>
                </div>

                {/* Preview of detected array */}
                {sampleItem && (
                  <div className="space-y-2">
                    <label className="text-xs font-medium" style={{ color: '#fff' }}>
                      Exemplu Item din Array
                    </label>
                    <div
                      className="rounded-lg p-3 overflow-auto"
                      style={{
                        backgroundColor: '#0d1117',
                        border: '1px solid #333',
                        maxHeight: '150px',
                      }}
                    >
                      <pre className="text-xs font-mono" style={{ color: '#7ee787' }}>
                        {JSON.stringify(sampleItem, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Include Index Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#252525' }}>
                  <div>
                    <label className="text-xs font-medium" style={{ color: '#fff' }}>
                      Include Index (_index)
                    </label>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      Adaugă indexul curent (0, 1, 2...) în fiecare item
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, includeIndex: !prev.includeIndex }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.includeIndex ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.includeIndex ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Include Total Toggle */}
                <div className="flex items-center justify-between p-3 rounded-lg" style={{ backgroundColor: '#252525' }}>
                  <div>
                    <label className="text-xs font-medium" style={{ color: '#fff' }}>
                      Include Total (_total)
                    </label>
                    <p className="text-xs mt-0.5" style={{ color: '#888' }}>
                      Adaugă numărul total de items în fiecare item
                    </p>
                  </div>
                  <button
                    onClick={() => setConfig(prev => ({ ...prev, includeTotal: !prev.includeTotal }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      config.includeTotal ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        config.includeTotal ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Preview Output */}
                {previewOutput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-medium" style={{ color: '#fff' }}>
                        Preview Output
                      </label>
                      <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#1e3a28', color: '#86efac' }}>
                        {previewOutput.totalItems} items total → {previewOutput.totalItems} execuții separate
                      </span>
                    </div>
                    <div
                      className="rounded-lg p-3 overflow-auto"
                      style={{
                        backgroundColor: '#0d1117',
                        border: '1px solid #333',
                        maxHeight: '200px',
                      }}
                    >
                      <pre className="text-xs font-mono" style={{ color: '#7ee787' }}>
                        {JSON.stringify(previewOutput.items, null, 2)}
                      </pre>
                      {previewOutput.totalItems > 3 && (
                        <p className="text-xs mt-2" style={{ color: '#888' }}>
                          ... și încă {previewOutput.totalItems - 3} items
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Use case hint */}
                <div className="rounded-lg p-3" style={{ backgroundColor: '#3d2d1a', border: '1px solid #a16207' }}>
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 mt-0.5" style={{ color: '#fbbf24' }} />
                    <div>
                      <p className="text-xs font-medium" style={{ color: '#fbbf24' }}>
                        Workflow: 999.md → AmoCRM
                      </p>
                      <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                        1. 999.md Scraper extrage 100 anunțuri (array)<br />
                        2. Split Out împarte în 100 items individuale<br />
                        3. AmoCRM primește fiecare item și creează lead separat
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'settings' && (
              <div className="p-4 space-y-4">
                {/* Item Field Name */}
                <div className="space-y-2">
                  <label className="text-xs font-medium" style={{ color: '#fff' }}>
                    Numele câmpului pentru item
                  </label>
                  <input
                    type="text"
                    value={config.itemFieldName}
                    onChange={(e) => setConfig(prev => ({ ...prev, itemFieldName: e.target.value }))}
                    placeholder="item"
                    className="w-full px-3 py-2 rounded-lg text-sm font-mono"
                    style={{
                      backgroundColor: '#252525',
                      border: '1px solid #333',
                      color: '#fff',
                    }}
                  />
                  <p className="text-xs" style={{ color: '#888' }}>
                    Numele câmpului în care va fi plasat fiecare item (default: "item")
                  </p>
                </div>

                {/* How it works explanation */}
                <div className="rounded-lg p-4" style={{ backgroundColor: '#1a2433', border: '1px solid #3b82f6' }}>
                  <p className="text-xs font-medium mb-2" style={{ color: '#3b82f6' }}>
                    Cum funcționează executarea:
                  </p>
                  <div className="text-xs space-y-2" style={{ color: '#94a3b8' }}>
                    <p>
                      <strong>Input:</strong> Un singur obiect cu un array
                    </p>
                    <pre className="bg-[#0d1117] p-2 rounded text-[10px] overflow-auto">
{`{
  "data": [item1, item2, item3]
}`}
                    </pre>
                    <p>
                      <strong>Output:</strong> Nodurile următoare se execută pentru fiecare item
                    </p>
                    <pre className="bg-[#0d1117] p-2 rounded text-[10px] overflow-auto">
{`Execuție 1: { "item": item1, "_index": 0, "_total": 3 }
Execuție 2: { "item": item2, "_index": 1, "_total": 3 }
Execuție 3: { "item": item3, "_index": 2, "_total": 3 }`}
                    </pre>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div
            className="flex items-center justify-end gap-3 px-4 py-3 border-t"
            style={{ borderColor: '#333', backgroundColor: '#222' }}
          >
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#333', color: '#fff' }}
            >
              Close
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: '#10B981', color: '#fff' }}
            >
              Save
            </button>
          </div>
        </div>

        {/* OUTPUT Panel - Right (Ghost Style) */}
        <div
          className="hidden lg:flex flex-col overflow-hidden"
          style={{
            flex: 1,
            minWidth: '400px',
            
            backgroundColor: 'rgba(19, 20, 25, 0.6)',
            backdropFilter: 'blur(5px)',
            borderTopRightRadius: '8px',
            borderBottomRightRadius: '8px',
            borderLeft: '1px solid rgba(255,255,255,0.05)',
          }}
        >
          <div className="flex-1 overflow-auto">
            <N8NNodeIOPanel
              title="OUTPUT"
              data={previewOutput ? previewOutput.items : outputData}
              enableDrag={false}
            />
          </div>
        </div>
      </div>
    </div>
  );

  return ReactDOM.createPortal(
    modalContent,
    document.body
  );
};
