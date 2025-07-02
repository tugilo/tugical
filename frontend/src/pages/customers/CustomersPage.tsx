/**
 * tugical Admin Dashboard 顧客管理ページ
 * 
 * @author tugical Development Team
 * @version 1.0
 * @since 2025-07-02
 */

import React, { useEffect } from 'react';
import { useUIStore } from '../../stores/uiStore';
import Card from '../../components/ui/Card';

const CustomersPage: React.FC = () => {
  const { setPageTitle } = useUIStore();

  useEffect(() => {
    setPageTitle('顧客管理');
  }, [setPageTitle]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">顧客管理</h1>
      </div>

      <Card>
        <Card.Body>
          <p className="text-gray-600">顧客管理機能は実装中です...</p>
        </Card.Body>
      </Card>
    </div>
  );
};

export default CustomersPage; 