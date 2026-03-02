import React, { useState, useEffect } from 'react';
import { X, Phone, Bot, Clock, RefreshCw, ChevronDown, ChevronUp, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/components/AuthContext';
import { toast } from 'sonner';

interface Agent {
  id: string;
  name: string;
  agent_id: string;
}

interface PhoneNumber {
  id: string;
  phone_number: string;
  label: string;
  elevenlabs_phone_id: string;
}

interface N8NKalinaCallConfigProps {
  node: {
    id: string;
    label: string;
    config?: {
      agentId?: string;
      phoneNumberId?: string;
      phoneField?: string;
      nameField?: string;
      infoFields?: string[];
      callInterval?: number;
      retryEnabled?: boolean;
      retryCount?: number;
      retryDelay?: number;
    };
  };
  onClose: () => void;
  onSave: (config: any) => void;
  previousNodeData?: any;
}

export const N8NKalinaCallConfig: React.FC<N8NKalinaCallConfigProps> = ({
  node,
  onClose,
  onSave,
  previousNodeData,
}) => {
  const { user } = useAuth();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [phoneNumbers, setPhoneNumbers] = useState<PhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Config state
  const [agentId, setAgentId] = useState(node.config?.agentId || '');
  const [phoneNumberId, setPhoneNumberId] = useState(node.config?.phoneNumberId || '');
  const [phoneField, setPhoneField] = useState(node.config?.phoneField || 'Phone');
  const [nameField, setNameField] = useState(node.config?.nameField || 'Full_Name');
  const [infoFields, setInfoFields] = useState<string[]>(node.config?.infoFields || ['Full_Name', 'Company', 'Email']);
  const [callInterval, setCallInterval] = useState(node.config?.callInterval || 30);
  const [retryEnabled, setRetryEnabled] = useState(node.config?.retryEnabled || false);
  const [retryCount, setRetryCount] = useState(node.config?.retryCount || 2);
  const [retryDelay, setRetryDelay] = useState(node.config?.retryDelay || 300);

  // Common phone field options
  const phoneFieldOptions = [
    { value: 'Phone', label: 'Phone (Zoho)' },
    { value: 'Mobile', label: 'Mobile (Zoho)' },
    { value: 'phone', label: 'phone (Google Sheets)' },
    { value: 'telefon', label: 'telefon (Custom)' },
    { value: 'phoneNumber', label: 'phoneNumber' },
    { value: 'callerNumber', label: 'callerNumber (Call History)' },
  ];

  // Common name field options
  const nameFieldOptions = [
    { value: 'Full_Name', label: 'Full_Name (Zoho)' },
    { value: 'First_Name', label: 'First_Name (Zoho)' },
    { value: 'name', label: 'name (Google Sheets)' },
    { value: 'contactName', label: 'contactName (Call History)' },
    { value: 'nume', label: 'nume (Custom)' },
  ];

  // Info fields grouped by category
  const infoFieldCategories = [
    {
      name: '👤 Contact Basic',
      fields: [
        { value: 'Full_Name', label: 'Full_Name' },
        { value: 'First_Name', label: 'First_Name' },
        { value: 'Last_Name', label: 'Last_Name' },
        { value: 'Salutation', label: 'Salutation (Mr./Mrs.)' },
        { value: 'Email', label: 'Email' },
        { value: 'Secondary_Email', label: 'Secondary_Email' },
        { value: 'Phone', label: 'Phone' },
        { value: 'Mobile', label: 'Mobile' },
      ]
    },
    {
      name: '🏢 Company',
      fields: [
        { value: 'Company', label: 'Company' },
        { value: 'Designation', label: 'Designation (Funcție)' },
        { value: 'Industry', label: 'Industry' },
        { value: 'Website', label: 'Website' },
        { value: 'Company_phone', label: 'Company_phone' },
      ]
    },
    {
      name: '📊 Lead Info',
      fields: [
        { value: 'Lead_Status', label: 'Lead_Status' },
        { value: 'Lead_Source', label: 'Lead_Source' },
        { value: 'Rating', label: 'Rating' },
        { value: 'Budget', label: 'Budget' },
        { value: 'Description', label: 'Description' },
        { value: 'Zia_Score', label: 'Zia_Score' },
      ]
    },
    {
      name: '📍 Location',
      fields: [
        { value: 'Street', label: 'Street' },
        { value: 'City', label: 'City' },
        { value: 'State', label: 'State' },
        { value: 'Country', label: 'Country' },
        { value: 'Zip_Code', label: 'Zip_Code' },
        { value: 'Full_Address', label: 'Full_Address' },
      ]
    },
    {
      name: '🚚 Transport/Logistics',
      fields: [
        { value: 'Vehicle_Type', label: 'Vehicle_Type' },
        { value: 'Transport_Type', label: 'Transport_Type' },
        { value: 'Model', label: 'Model' },
        { value: 'Operable', label: 'Operable' },
        { value: 'Number_of_Vehicles', label: 'Number_of_Vehicles' },
        { value: 'Pickup_Location', label: 'Pickup_Location' },
        { value: 'Pickup_Contact', label: 'Pickup_Contact' },
        { value: 'Pickup_Mobile', label: 'Pickup_Mobile' },
        { value: 'Delivery_Location', label: 'Delivery_Location' },
        { value: 'Delivery_Contact', label: 'Delivery_Contact' },
        { value: 'Delivery_Mobile', label: 'Delivery_Mobile' },
        { value: 'Shipment_Date', label: 'Shipment_Date' },
        { value: 'Delivery_Date', label: 'Delivery_Date' },
        { value: 'Shipment_Distance', label: 'Shipment_Distance' },
        { value: 'Transit_Time', label: 'Transit_Time' },
        { value: 'Price', label: 'Price' },
        { value: 'Calculated_Price', label: 'Calculated_Price' },
        { value: 'Discounted_Price', label: 'Discounted_Price' },
      ]
    },
    {
      name: '📅 Meta/Owner',
      fields: [
        { value: 'Owner.name', label: 'Owner Name' },
        { value: 'Owner.email', label: 'Owner Email' },
        { value: 'Created_Time', label: 'Created_Time' },
        { value: 'Modified_Time', label: 'Modified_Time' },
        { value: 'Last_Activity_Time', label: 'Last_Activity_Time' },
      ]
    },
  ];

  // Flatten all fields for Select All functionality
  const allInfoFields = infoFieldCategories.flatMap(cat => cat.fields.map(f => f.value));

  const handleSelectAll = () => {
    setInfoFields([...allInfoFields]);
  };

  const handleDeselectAll = () => {
    setInfoFields([]);
  };

  const handleSelectCategory = (categoryFields: string[]) => {
    const newFields = [...new Set([...infoFields, ...categoryFields])];
    setInfoFields(newFields);
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch agents
        const { data: agentsData, error: agentsError } = await supabase
          .from('kalina_agents')
          .select('id, name, agent_id')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('name');

        if (agentsError) throw agentsError;
        setAgents(agentsData || []);

        // Fetch phone numbers
        const { data: phonesData, error: phonesError } = await supabase
          .from('phone_numbers')
          .select('id, phone_number, label, elevenlabs_phone_id')
          .or(`user_id.eq.${user.id},and(is_shared.eq.true,shared_with_user_id.eq.${user.id})`)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (phonesError) throw phonesError;
        setPhoneNumbers(phonesData || []);

      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load agents and phone numbers');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleSave = () => {
    if (!agentId) {
      toast.error('Please select an agent');
      return;
    }
    if (!phoneNumberId) {
      toast.error('Please select a phone number');
      return;
    }

    const config = {
      agentId,
      phoneNumberId,
      phoneField,
      nameField,
      infoFields,
      callInterval,
      retryEnabled,
      retryCount,
      retryDelay,
    };

    onSave(config);
    toast.success('Kalina Call configuration saved');
  };

  return (
    <div
      className="fixed z-50 flex flex-col rounded-xl overflow-hidden"
      style={{
        right: '80px',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '420px',
        maxHeight: '80vh',
        backgroundColor: '#1e1e1e',
        border: '1px solid #444',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)',
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ backgroundColor: '#252525', borderBottom: '1px solid #333' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex items-center justify-center rounded-lg"
            style={{
              width: '36px',
              height: '36px',
              background: 'linear-gradient(135deg, #ff6b5a 0%, #ff8a7a 100%)',
            }}
          >
            <Phone style={{ width: '18px', height: '18px', color: '#fff' }} />
          </div>
          <div>
            <div style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>
              Kalina Call
            </div>
            <div style={{ color: '#888', fontSize: '11px' }}>
              Inițiază apeluri cu agentul AI
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-[#333] transition-colors"
        >
          <X style={{ width: '16px', height: '16px', color: '#888' }} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="animate-spin" style={{ width: '24px', height: '24px', color: '#ff6b5a' }} />
          </div>
        ) : (
          <>
            {/* Agent Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2" style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                <Bot style={{ width: '14px', height: '14px' }} />
                Agent AI
              </label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                }}
              >
                <option value="">Selectează agent...</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.agent_id}>
                    {agent.name}
                  </option>
                ))}
              </select>
              {agents.length === 0 && (
                <div style={{ color: '#ff6b5a', fontSize: '11px' }}>
                  Nu aveți agenți activi. Creați un agent în secțiunea Agenți.
                </div>
              )}
            </div>

            {/* Phone Number Selection */}
            <div className="space-y-2">
              <label className="flex items-center gap-2" style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                <Phone style={{ width: '14px', height: '14px' }} />
                Număr de ieșire (Caller ID)
              </label>
              <select
                value={phoneNumberId}
                onChange={(e) => setPhoneNumberId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                }}
              >
                <option value="">Selectează număr...</option>
                {phoneNumbers.map((phone) => (
                  <option key={phone.id} value={phone.id}>
                    {phone.phone_number} {phone.label ? `(${phone.label})` : ''}
                  </option>
                ))}
              </select>
              {phoneNumbers.length === 0 && (
                <div style={{ color: '#ff6b5a', fontSize: '11px' }}>
                  Nu aveți numere de telefon active. Adăugați un număr în secțiunea Numere de Telefon.
                </div>
              )}
            </div>

            {/* Phone Field Mapping */}
            <div className="space-y-2">
              <label style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                🔗 Câmp telefon din date
              </label>
              <select
                value={phoneField}
                onChange={(e) => setPhoneField(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                }}
              >
                {phoneFieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <div style={{ color: '#666', fontSize: '10px' }}>
                Câmpul din datele nodului anterior care conține numărul de telefon
              </div>
            </div>

            {/* Name Field Mapping */}
            <div className="space-y-2">
              <label style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                👤 Câmp nume contact din date
              </label>
              <select
                value={nameField}
                onChange={(e) => setNameField(e.target.value)}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                }}
              >
                {nameFieldOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info Fields for Agent */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                  📋 Info pentru Agent ({infoFields.length} selectate)
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="px-2 py-1 rounded text-xs transition-colors hover:bg-[#333]"
                    style={{ backgroundColor: '#252525', color: '#ff6b5a', border: '1px solid #333' }}
                  >
                    Toate
                  </button>
                  <button
                    onClick={handleDeselectAll}
                    className="px-2 py-1 rounded text-xs transition-colors hover:bg-[#333]"
                    style={{ backgroundColor: '#252525', color: '#888', border: '1px solid #333' }}
                  >
                    Niciunul
                  </button>
                </div>
              </div>
              <div 
                className="rounded-lg p-3 space-y-3 max-h-64 overflow-y-auto"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                }}
              >
                {infoFieldCategories.map((category) => (
                  <div key={category.name} className="space-y-1">
                    <div 
                      className="flex items-center justify-between cursor-pointer hover:bg-[#252525] px-2 py-1 rounded"
                      onClick={() => handleSelectCategory(category.fields.map(f => f.value))}
                    >
                      <span style={{ color: '#ff6b5a', fontSize: '11px', fontWeight: 600 }}>
                        {category.name}
                      </span>
                      <span style={{ color: '#555', fontSize: '10px' }}>
                        {category.fields.filter(f => infoFields.includes(f.value)).length}/{category.fields.length}
                      </span>
                    </div>
                    <div className="pl-2 space-y-0.5">
                      {category.fields.map((opt) => (
                        <label 
                          key={opt.value} 
                          className="flex items-center gap-2 cursor-pointer hover:bg-[#252525] px-2 py-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={infoFields.includes(opt.value)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setInfoFields([...infoFields, opt.value]);
                              } else {
                                setInfoFields(infoFields.filter(f => f !== opt.value));
                              }
                            }}
                            className="rounded"
                            style={{ accentColor: '#ff6b5a', width: '14px', height: '14px' }}
                          />
                          <span style={{ color: '#aaa', fontSize: '11px' }}>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ color: '#666', fontSize: '10px' }}>
                Aceste câmpuri vor fi trimise agentului AI pentru context. Click pe categorie pentru a selecta toate câmpurile din ea.
              </div>
            </div>

            {/* Call Interval */}
            <div className="space-y-2">
              <label className="flex items-center gap-2" style={{ color: '#ccc', fontSize: '12px', fontWeight: 500 }}>
                <Clock style={{ width: '14px', height: '14px' }} />
                Interval între apeluri (secunde)
              </label>
              <input
                type="number"
                value={callInterval}
                onChange={(e) => setCallInterval(parseInt(e.target.value) || 30)}
                min={10}
                max={300}
                className="w-full px-3 py-2.5 rounded-lg text-sm"
                style={{
                  backgroundColor: '#1a1a1a',
                  border: '1px solid #333',
                  color: '#fff',
                }}
              />
              <div style={{ color: '#666', fontSize: '10px' }}>
                Timp de așteptare între apeluri consecutive (minim 10s)
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 w-full py-2 text-left"
              style={{ color: '#888', fontSize: '12px' }}
            >
              {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              Opțiuni avansate
            </button>

            {/* Advanced Options */}
            {showAdvanced && (
              <div className="space-y-4 pl-2" style={{ borderLeft: '2px solid #333' }}>
                {/* Retry Settings */}
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={retryEnabled}
                      onChange={(e) => setRetryEnabled(e.target.checked)}
                      className="rounded"
                    />
                    <span style={{ color: '#ccc', fontSize: '12px' }}>
                      Reîncearcă apelurile eșuate
                    </span>
                  </label>
                </div>

                {retryEnabled && (
                  <>
                    <div className="space-y-2">
                      <label style={{ color: '#888', fontSize: '11px' }}>
                        Număr de reîncercări
                      </label>
                      <input
                        type="number"
                        value={retryCount}
                        onChange={(e) => setRetryCount(parseInt(e.target.value) || 2)}
                        min={1}
                        max={5}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label style={{ color: '#888', fontSize: '11px' }}>
                        Delay între reîncercări (secunde)
                      </label>
                      <input
                        type="number"
                        value={retryDelay}
                        onChange={(e) => setRetryDelay(parseInt(e.target.value) || 300)}
                        min={60}
                        max={3600}
                        className="w-full px-3 py-2 rounded-lg text-sm"
                        style={{
                          backgroundColor: '#1a1a1a',
                          border: '1px solid #333',
                          color: '#fff',
                        }}
                      />
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <div
        className="flex items-center justify-end gap-2 px-4 py-3"
        style={{ backgroundColor: '#252525', borderTop: '1px solid #333' }}
      >
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-colors hover:bg-[#444]"
          style={{ backgroundColor: '#333', color: '#fff' }}
        >
          Anulează
        </button>
        <button
          onClick={handleSave}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: 'linear-gradient(135deg, #ff6b5a 0%, #ff8a7a 100%)',
            color: '#fff',
          }}
        >
          <Save style={{ width: '14px', height: '14px' }} />
          Salvează
        </button>
      </div>
    </div>
  );
};
