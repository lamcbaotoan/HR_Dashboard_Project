// frontend/src/components/charts/EmployeeDeptChart.js
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const EmployeeDeptChart = ({ data, barColor, textColor }) => {
  const chartData = Array.isArray(data) ? data : Object.keys(data).map(key => ({
    name: key,
    value: data[key]
  }));

  return (
    <div style={{ height: 300 }}>
      <h4 style={{textAlign:'center', color: textColor || '#888', marginBottom:'15px'}}>
        Phân phối Nhân viên
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={textColor || "#ccc"}
            tick={{fontSize: 12}}
            angle={-45}
            textAnchor="end"
            height={60} 
          />
          <YAxis stroke={textColor || "#ccc"} allowDecimals={false} />
          <Tooltip 
            contentStyle={{backgroundColor: '#333', border: '1px solid #555', color: '#fff'}}
            labelStyle={{color: '#ccc'}}
          />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="value" 
            name="Số lượng"
            stroke={barColor || "#82ca9d"} 
            strokeWidth={3}
            activeDot={{ r: 8 }} 
            dot={{r: 4}}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EmployeeDeptChart;