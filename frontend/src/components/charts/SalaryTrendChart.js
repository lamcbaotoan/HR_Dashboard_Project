import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const SalaryTrendChart = ({ data }) => {
  // Định dạng tiền tệ cho trục Y và Tooltip
  const formatCurrency = (value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumSignificantDigits: 3 }).format(value);

  return (
    <div style={{ height: 300 }}>
      <h4 style={{textAlign:'center', color:'var(--text-color-secondary)', marginBottom:'10px'}}>Xu hướng Quỹ lương (6 tháng)</h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis tickFormatter={(value) => new Intl.NumberFormat('vi-VN', { notation: "compact", compactDisplay: "short" }).format(value)}/>
          <Tooltip formatter={(value) => formatCurrency(value)} contentStyle={{backgroundColor:'var(--card-bg)', borderColor:'var(--border-color)', color:'var(--text-color)'}}/>
          <Legend />
          <Line type="monotone" dataKey="value" name="Tổng lương" stroke="#8884d8" activeDot={{ r: 8 }} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SalaryTrendChart;