import { useCallback } from 'react';
import { useSelector } from 'react-redux';

export const usePermissions = () => {
  const { myActions, loading } = useSelector((state) => state.permissions);

  const can = useCallback((...actions) => actions.some((action) => myActions.includes(action)), [myActions]);

  return { can, myActions, loading };
};

export default usePermissions;