import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Copy, Download, Trash2, Bug, AlertTriangle } from 'lucide-react';
import { androidDebug, safeSringify } from '@/utils/androidDebug';
import { NativeErrorMonitor } from '@/utils/nativeErrorMonitor';
import { useToast } from '@/hooks/use-toast';

const AndroidDebugConsole = () => {
  const [logs, setLogs] = useState<any[]>([]);
  const [breadcrumbs, setBreadcrumbs] = useState<any[]>([]);
  const { toast } = useToast();

  const refreshData = () => {
    setLogs(androidDebug.getLogs());
    setBreadcrumbs(NativeErrorMonitor.getBreadcrumbs());
  };

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 2000);
    return () => clearInterval(interval);
  }, []);

  const copyToClipboard = async (data: any) => {
    try {
      await navigator.clipboard.writeText(safeSringify(data));
      toast({ title: 'In Zwischenablage kopiert!' });
    } catch (e) {
      toast({ title: 'Kopieren fehlgeschlagen', variant: 'destructive' });
    }
  };

  const exportDebugReport = async () => {
    const report = NativeErrorMonitor.getDebugReport();
    await copyToClipboard(report);
    toast({ title: 'Vollständiger Debug-Report kopiert!' });
  };

  const clearAllLogs = () => {
    androidDebug.clearLogs();
    NativeErrorMonitor.clearBreadcrumbs();
    refreshData();
    toast({ title: 'Alle Logs gelöscht' });
  };

  const getBadgeVariant = (type: string) => {
    switch (type) {
      case 'error': return 'destructive';
      case 'navigation': return 'secondary';
      case 'user-action': return 'outline';
      default: return 'default';
    }
  };

  const getLogLevel = (message: string) => {
    if (message.includes('CRITICAL') || message.includes('Error')) return 'error';
    if (message.includes('Warning') || message.includes('Warn')) return 'warning';
    return 'info';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 p-4">
      <div className="container mx-auto py-8 max-w-6xl">
        <Card className="bg-slate-800/50 border-slate-700">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bug className="h-6 w-6 text-blue-400" />
                <CardTitle className="text-white">Android Debug Console</CardTitle>
              </div>
              <div className="flex gap-2">
                <Button onClick={exportDebugReport} size="sm" variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export Report
                </Button>
                <Button onClick={clearAllLogs} size="sm" variant="destructive">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Clear All
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="logs" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-slate-700">
                <TabsTrigger value="logs" className="text-white">
                  Android Logs ({logs.length})
                </TabsTrigger>
                <TabsTrigger value="breadcrumbs" className="text-white">
                  Breadcrumbs ({breadcrumbs.length})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="logs" className="mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Android Debug Logs</h3>
                    <Button onClick={() => copyToClipboard(logs)} size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Logs
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded border bg-slate-900/50 p-4">
                    {logs.length === 0 ? (
                      <p className="text-slate-400">Keine Logs verfügbar</p>
                    ) : (
                      <div className="space-y-2">
                        {logs.map((log, index) => (
                          <div key={index} className="border-l-2 border-slate-600 pl-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getLogLevel(log.message) === 'error' ? 'destructive' : 'secondary'}>
                                {log.timestamp}
                              </Badge>
                              {getLogLevel(log.message) === 'error' && (
                                <AlertTriangle className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                            <p className="text-white font-mono text-sm">{log.message}</p>
                            {log.data && (
                              <details className="mt-1">
                                <summary className="text-slate-400 cursor-pointer text-xs">
                                  Show data
                                </summary>
                                <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                                  {safeSringify(log.data)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
              
              <TabsContent value="breadcrumbs" className="mt-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-white">Error Breadcrumbs</h3>
                    <Button onClick={() => copyToClipboard(breadcrumbs)} size="sm" variant="outline">
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Breadcrumbs
                    </Button>
                  </div>
                  
                  <ScrollArea className="h-[400px] rounded border bg-slate-900/50 p-4">
                    {breadcrumbs.length === 0 ? (
                      <p className="text-slate-400">Keine Breadcrumbs verfügbar</p>
                    ) : (
                      <div className="space-y-2">
                        {breadcrumbs.map((breadcrumb, index) => (
                          <div key={index} className="border-l-2 border-blue-500 pl-3 py-2">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant={getBadgeVariant(breadcrumb.type)}>
                                {breadcrumb.type}
                              </Badge>
                              <span className="text-xs text-slate-400">
                                {new Date(breadcrumb.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-white text-sm">{breadcrumb.message}</p>
                            {breadcrumb.data && (
                              <details className="mt-1">
                                <summary className="text-slate-400 cursor-pointer text-xs">
                                  Show data
                                </summary>
                                <pre className="text-xs text-slate-300 bg-slate-800 p-2 rounded mt-1 overflow-x-auto">
                                  {safeSringify(breadcrumb.data)}
                                </pre>
                              </details>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AndroidDebugConsole;