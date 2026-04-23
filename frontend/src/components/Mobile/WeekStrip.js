import React, { useEffect, useRef } from 'react';
import moment from 'moment';
import 'moment/locale/es';
import './WeekStrip.css';

const WeekStrip = ({ selectedDate, onDateSelect, workload = {} }) => {
  const scrollRef = useRef(null);
  
  // Generar un rango de días (ej: 7 días atrás y 14 adelante)
  const days = [];
  const start = moment(selectedDate).subtract(7, 'days');
  for (let i = 0; i < 21; i++) {
    days.push(moment(start).add(i, 'days'));
  }

  const getHeatColor = (count) => {
    if (!count || count === 0) return '#cbd5e1'; // Gris
    if (count <= 4) return '#22c55e'; // Verde
    if (count <= 8) return '#eab308'; // Amarillo
    return '#ef4444'; // Rojo
  };

  useEffect(() => {
    // Centrar la fecha seleccionada al inicio
    if (scrollRef.current) {
      const selectedEl = scrollRef.current.querySelector('.day-item.selected');
      if (selectedEl) {
        selectedEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  return (
    <div className="week-strip-container" ref={scrollRef}>
      {days.map((day) => {
        const dateStr = day.format('YYYY-MM-DD');
        const isSelected = day.isSame(selectedDate, 'day');
        const isToday = day.isSame(moment(), 'day');
        const count = workload[dateStr] || 0;

        return (
          <div
            key={dateStr}
            className={`day-item ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
            onClick={() => onDateSelect(day.toDate())}
          >
            <span className="day-name">{day.format('ddd')}</span>
            <span className="day-num">{day.format('D')}</span>
            <div 
              className="heat-dot" 
              style={{ backgroundColor: getHeatColor(count) }}
              title={`${count} visitas`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default WeekStrip;
