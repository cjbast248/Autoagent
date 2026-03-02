import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, UserCheck, UserX, Phone } from 'lucide-react';
import { Contact } from '@/hooks/useContacts';

interface ContactStatsProps {
  contacts?: Contact[];
}

export function ContactStats({ contacts = [] }: ContactStatsProps) {
  const totalContacts = contacts.length;
  const activeContacts = contacts.filter(c => c.status === 'active').length;
  const inactiveContacts = contacts.filter(c => c.status === 'inactive').length;
  const recentlyContacted = contacts.filter(c => {
    if (!c.last_contact_date) return false;
    const lastContact = new Date(c.last_contact_date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return lastContact > thirtyDaysAgo;
  }).length;

  const stats = [
    {
      title: 'Total Contacte',
      value: totalContacts,
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Contacte Active',
      value: activeContacts,
      icon: UserCheck,
      color: 'text-green-600'
    },
    {
      title: 'Contacte Inactive',
      value: inactiveContacts,
      icon: UserX,
      color: 'text-yellow-600'
    },
    {
      title: 'Contactate Recent',
      value: recentlyContacted,
      icon: Phone,
      color: 'text-purple-600'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            {totalContacts > 0 && (
              <p className="text-xs text-muted-foreground">
                {((stat.value / totalContacts) * 100).toFixed(1)}% din total
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}