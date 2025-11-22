// frontend/src/components/charts/CostStructureChart.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const CostStructureChart = ({ salary, bonus, dividend }) => {
  const data = [
    { name: 'Lương CB', value: salary },
    { name: 'Thưởng', value: bonus },
    { name: 'Cổ tức', value: dividend },
  ];

  // Màu sắc: Lương (Xanh), Cổ tức (Tím), Thưởng (Vàng)
  const COLORS = ['#0088FE', '#8884d8', '#FFBB28'];

  // [FIX] Định nghĩa hàm này và SỬ DỤNG nó trong Tooltip bên dưới
  const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

  return (
    <div style={{ height: 300 }}>
      <h4 style={{textAlign:'center', color:'var(--text-color)', marginBottom:'10px'}}>Tỷ lệ Chi phí Nhân sự</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          {/* [FIX] Gọi hàm formatCurrency tại đây */}
          <Tooltip formatter={(val) => formatCurrency(val)} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CostStructureChart;