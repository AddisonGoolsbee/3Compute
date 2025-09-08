import { useContext, useState, useEffect } from 'react';
import { UserDataContext } from '../util/UserData';
import { getClasses } from '@luminescent/ui-react';

export default function BlurOverlay() {
  const userData = useContext(UserDataContext);
  const [showOverlay, setShowOverlay] = useState(true);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (userData.userInfo) {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setShowOverlay(false);
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShowOverlay(true);
      setIsVisible(true);
    }
  }, [userData]);

  return (
    <>
      {showOverlay && (
        <div
          className={getClasses({
            'h-screen w-screen fixed top-0 left-0 backdrop-blur-lg bg-gray-900/50 z-10 transition-opacity duration-200': true,
            'opacity-0': !isVisible,
          })}
        />
      )}
    </>
  );
}
