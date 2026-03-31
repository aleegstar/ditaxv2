
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User } from '@/types';

interface UserInfoCardProps {
  user: User;
}

const UserInfoCard: React.FC<UserInfoCardProps> = ({ user }) => {
  return (
    <Card className="shadow-sm border-white/40 bg-white/60 backdrop-blur-xl rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/10 to-primary/20 flex items-center justify-center border border-primary/20">
            <span className="text-primary text-xl font-bold">
              {user.firstName?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="flex-1">
            <CardTitle className="text-xl font-semibold">
              {user.firstName} {user.lastName}
            </CardTitle>
            <p className="text-muted-foreground">
              {user.email || 'Keine E-Mail verfügbar'}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant="secondary">
                {user.status}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rolle:</span>
              <Badge variant="outline">
                {user.role}
              </Badge>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Dokumente:</span>
              <span className="font-semibold">{user.documents.length}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Steuererklärungen:</span>
              <span className="font-semibold">{user.taxReturns.length}</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default UserInfoCard;
