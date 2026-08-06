import { useState } from 'react';
import {
  DndContext,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  DragOverlay,
  closestCorners,
} from '@dnd-kit/core';
import { kanbanColumna } from '../../lib/data';
import { formatMoney } from '../../lib/format';

const COLUMNAS = [
  { id: 'Aprobada', titulo: 'Aprobadas', icono: 'check_circle', color: 'var(--primary)' },
  { id: 'Autorizado', titulo: 'Autorizadas', icono: 'verified_user', color: 'var(--success)' },
  { id: 'Rechazada', titulo: 'Rechazadas', icono: 'cancel', color: 'var(--error)' },
];

const badgePago = (pagoStatus) =>
  pagoStatus === 'Aprobado' ? 'badge-success' : pagoStatus === 'Pendiente' ? 'badge-pending' : 'badge-error';

function CardContent({ order }) {
  return (
    <>
      <div className="kanban-card-top">
        <span className="body-sm text-on-surface" style={{ fontWeight: 700 }}>{order.id}</span>
        <span className="label-caps text-on-surface-variant" style={{ fontSize: '10px' }}>{order.origen}</span>
      </div>
      <span className="body-sm text-on-surface" style={{ fontWeight: 600 }}>{order.cliente}</span>
      <span className="label-caps text-primary">{formatMoney(order.total)}</span>
      <div className="kanban-card-badges">
        <span className={`badge ${order.factibilidad === 'Aprobada' ? 'badge-success' : 'badge-error'}`}>
          {order.factibilidad}
        </span>
        <span className={`badge ${badgePago(order.pagoStatus)}`}>{order.pagoStatus}</span>
      </div>
    </>
  );
}

function TarjetaOrden({ order }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `card-${order.id}`,
    data: { order },
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`kanban-card ${isDragging ? 'kanban-card--dragging' : ''}`}
      title="Arrastrar para cambiar estado"
    >
      <CardContent order={order} />
    </div>
  );
}

function Columna({ col, ordenes }) {
  const { setNodeRef, isOver } = useDroppable({ id: col.id });
  return (
    <div ref={setNodeRef} className={`kanban-col ${isOver ? 'kanban-col--over' : ''}`}>
      <div className="kanban-col-head">
        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: col.color }}>{col.icono}</span>
        <span className="label-caps" style={{ fontWeight: 700 }}>{col.titulo}</span>
        <span className="badge badge-pending">{ordenes.length}</span>
      </div>
      <div className="kanban-col-body">
        {ordenes.map((o) => (
          <TarjetaOrden key={o.id} order={o} />
        ))}
        {ordenes.length === 0 && <p className="kanban-empty">Sin órdenes</p>}
      </div>
    </div>
  );
}

export default function KanbanOrdenes({ orders, onMove }) {
  const [activeOrder, setActiveOrder] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const columnas = COLUMNAS.map((c) => ({ ...c, ordenes: orders.filter((o) => kanbanColumna(o) === c.id) }));

  const handleDragStart = (event) => {
    const order = orders.find((o) => `card-${o.id}` === event.active.id);
    setActiveOrder(order || null);
  };

  const handleDragEnd = (event) => {
    const order = orders.find((o) => `card-${o.id}` === event.active.id);
    setActiveOrder(null);
    if (!order || !event.over) return;
    const target = event.over.id;
    if (COLUMNAS.some((c) => c.id === target) && target !== kanbanColumna(order)) {
      onMove(order, target);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveOrder(null)}
    >
      <div className="kanban-board">
        {columnas.map((c) => (
          <Columna key={c.id} col={c} ordenes={c.ordenes} />
        ))}
      </div>
      <DragOverlay dropAnimation={null}>
        {activeOrder ? (
          <div className="kanban-card kanban-card--overlay">
            <CardContent order={activeOrder} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
