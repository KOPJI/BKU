import { useState, useEffect } from 'react';

let deferredPrompt: any;

function ReloadPrompt() {
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      setIsInstallable(true);
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt = null;
      setIsInstallable(false);
    });
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      deferredPrompt = null;
      setIsInstallable(false);
    }
  };

  if (!isInstallable) return null;

  return (
    <div className="fixed bottom-0 right-0 m-4 z-50">
      <div className="bg-white shadow-lg rounded-lg p-4 flex items-center space-x-4">
        <div className="flex-1">
          <span className="text-blue-600">
            Instal aplikasi untuk pengalaman yang lebih baik
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            onClick={installApp}
          >
            Instal
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReloadPrompt; 