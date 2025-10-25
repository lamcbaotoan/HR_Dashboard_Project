import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Biểu đồ lương trung bình
const AvgSalaryChart = ({ data }) => {
  const chartData = Object.keys(data).map(key => ({
    name: key,
    'Lương TB': data[key],
  }));

  return (
    <div style={{ height: 300 }}>
      <h4>Lương trung bình theo Phòng ban</h4>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar dataKey="Lương TB" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AvgSalaryChart;