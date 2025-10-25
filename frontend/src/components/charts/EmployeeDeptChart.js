import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Biểu đồ phân phối nhân viên theo phòng ban
const EmployeeDeptChart = ({ data }) => {
  // Chuyển đổi { "Phòng A": 10, "Phòng B": 20 }
  // thành [ { name: "Phòng A", count: 10 }, { name: "Phòng B", count: 20 } ]
  const chartData = Object.keys(data).map(key => ({
    name: key,
    'Số lượng': data[key],
  }));

  return (
    <div style={{ height: 300 }}>
      <h4>Phân phối Nhân viên theo Phòng ban</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Số lượng" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmployeeDeptChart;