
import React, { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Redirect /event/* to homepage
    if (location.pathname.startsWith('/event')) {
      navigate('/', { replace: true });
    }
  }, [location, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glass Effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-gradient-to-r from-accent/5 to-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/3 right-1/3 w-72 h-72 bg-gradient-to-r from-muted/20 to-muted/30 rounded-full blur-3xl"></div>
      </div>

      <Card className="liquid-glass relative z-10 max-w-md w-full animate-fade-in">
        <CardHeader className="text-center">
          <CardTitle className="text-4xl font-bold text-foreground mb-2">404</CardTitle>
          <p className="text-xl text-foreground">Pagina nu a fost găsită</p>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Ne pare rău, dar pagina pe care o căutați nu există sau a fost mutată.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button asChild className="glass-button">
              <Link to="/" className="flex items-center">
                <Home className="w-4 h-4 mr-2" />
                Înapoi acasă
              </Link>
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => window.history.back()}
              className="glass-button border-border"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Înapoi
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
