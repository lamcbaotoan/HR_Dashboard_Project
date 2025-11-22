// frontend/src/components/charts/StatusChart.js
import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const StatusChart = ({ data }) => {
  if (!data || data.length === 0) return <div style={{textAlign:'center', paddingTop:'50px'}}>Chưa có dữ liệu</div>;

  return (
    <div style={{ height: 300 }}>
      <h4 style={{textAlign:'center', color:'var(--text-color-secondary)', marginBottom:'10px'}}>Trạng thái Nhân viên</h4>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%" cy="50%"
            innerRadius={60} outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            label
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={{backgroundColor:'var(--card-bg)', borderColor:'var(--border-color)', color:'var(--text-color)'}} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
export default StatusChart;