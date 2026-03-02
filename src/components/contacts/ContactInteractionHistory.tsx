import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Phone, MessageSquare, Clock, User } from 'lucide-react';
import { useContacts, ContactInteraction } from '@/hooks/useContacts';
import { format } from 'date-fns';

interface ContactInteractionHistoryProps {
  contactId: string;
}

export function ContactInteractionHistory({ contactId }: ContactInteractionHistoryProps) {
  const [interactions, setInteractions] = useState<ContactInteraction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { getContactInteractions } = useContacts();

  useEffect(() => {
    const fetchInteractions = async () => {
      setIsLoading(true);
      try {
        const data = await getContactInteractions(contactId);
        setInteractions(data);
      } catch (error) {
        console.error('Error fetching interactions:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (contactId) {
      fetchInteractions();
    }
  }, [contactId, getContactInteractions]);

  const getInteractionIcon = (type: string) => {
    switch (type) {
      case 'call': return Phone;
      case 'sms': return MessageSquare;
      default: return MessageSquare;
    }
  };

  const getCallStatusBadge = (status?: string) => {
    if (!status) return null;
    
    switch (status) {
      case 'completed':
        return <Badge variant="default">Finalizat</Badge>;
      case 'failed':
        return <Badge variant="destructive">Eșuat</Badge>;
      case 'busy':
        return <Badge variant="secondary">Ocupat</Badge>;
      case 'no_answer':
        return <Badge variant="outline">Fără Răspuns</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Interacțiuni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (interactions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Istoric Interacțiuni</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nu există interacțiuni cu acest contact</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Istoric Interacțiuni ({interactions.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tip</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Durată</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Agent</TableHead>
                <TableHead>Sumar</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {interactions.map((interaction) => {
                const Icon = getInteractionIcon(interaction.interaction_type);
                
                return (
                  <TableRow key={interaction.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        <span className="capitalize">{interaction.interaction_type}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-2 text-muted-foreground" />
                        {format(new Date(interaction.interaction_date), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatDuration(interaction.duration_seconds)}
                    </TableCell>
                    <TableCell>
                      {getCallStatusBadge(interaction.call_status)}
                    </TableCell>
                    <TableCell>
                      {interaction.agent_id && (
                        <div className="flex items-center">
                          <User className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span className="text-sm">{interaction.agent_id}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="max-w-xs">
                        {interaction.summary && (
                          <p className="text-sm truncate" title={interaction.summary}>
                            {interaction.summary}
                          </p>
                        )}
                        {interaction.notes && (
                          <p className="text-xs text-muted-foreground truncate" title={interaction.notes}>
                            {interaction.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}