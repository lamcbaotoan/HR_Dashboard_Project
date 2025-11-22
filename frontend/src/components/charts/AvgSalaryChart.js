// frontend/src/components/charts/AvgSalaryChart.js
import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const AvgSalaryChart = ({ data, barColor, textColor }) => {
  // [FIX] Dữ liệu nhận vào là Mảng [{name: '...', value: ...}]
  // Không cần chuyển đổi Object.keys nữa
  
  const formatYAxis = (tickItem) => {
    if (tickItem >= 1000000) return `${tickItem / 1000000}M`;
    if (tickItem >= 1000) return `${tickItem / 1000}k`;
    return tickItem;
  };

  return (
    <div style={{ height: 300 }}>
      <h4 style={{textAlign:'center', color: textColor || '#888', marginBottom:'15px'}}>
        Lương trung bình theo Phòng ban
      </h4>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data} // Truyền trực tiếp data
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorSalary" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={barColor || "#8884d8"} stopOpacity={0.8}/>
              <stop offset="95%" stopColor={barColor || "#8884d8"} stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#444" vertical={false} />
          <XAxis 
            dataKey="name" 
            stroke={textColor || "#ccc"} 
            tick={{fontSize: 11}} 
            interval={0}
            angle={-15}  
            textAnchor="end"
            height={50}
          />
          <YAxis 
            stroke={textColor || "#ccc"} 
            tickFormatter={formatYAxis}
            width={40}
            tick={{fontSize: 12}}
          />
          <Tooltip 
            contentStyle={{backgroundColor: '#333', border: '1px solid #555', color: '#fff'}}
            formatter={(value) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value)}
            labelStyle={{color: '#ccc'}}
          />
          <Area 
            type="monotone" 
            dataKey="value" 
            stroke={barColor || "#8884d8"} 
            fillOpacity={1} 
            fill="url(#colorSalary)" 
            name="Lương TB"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default AvgSalaryChart;