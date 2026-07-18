/**
 * リソース優先順のドラッグ並べ替えリスト
 * HTML5 DnD（追加パッケージなし）で sort_order を更新する
 */

import React, { useEffect, useState } from 'react';
import { Resource } from '../../../types';
import { Bars3Icon } from '@heroicons/react/24/outline';

export interface ResourcePriorityListProps {
  resources: Resource[];
  /** 並べ替え確定時（新しい順の配列） */
  onReorder: (ordered: Resource[]) => void | Promise<void>;
  disabled?: boolean;
}

/**
 * 配列を並べ替える
 */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length) {
    return list;
  }
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * 優先順ドラッグリスト
 */
const ResourcePriorityList: React.FC<ResourcePriorityListProps> = ({
  resources,
  onReorder,
  disabled = false,
}) => {
  const [items, setItems] = useState<Resource[]>(resources);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setItems(resources);
  }, [resources]);

  const handleDragStart = (index: number) => {
    if (disabled || saving) return;
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (disabled || saving || dragIndex === null) return;
    setOverIndex(index);
  };

  const handleDrop = async (index: number) => {
    if (disabled || saving || dragIndex === null) return;
    const next = moveItem(items, dragIndex, index);
    setDragIndex(null);
    setOverIndex(null);
    if (next === items) return;

    setItems(next);
    setSaving(true);
    try {
      await onReorder(next);
    } catch {
      // 失敗時は親の再取得に任せる。見た目は一旦戻す
      setItems(resources);
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  if (items.length === 0) {
    return (
      <p className='text-sm text-gray-500 py-8 text-center'>
        並べ替え対象のリソースがありません
      </p>
    );
  }

  return (
    <div className='space-y-2'>
      <p className='text-sm text-gray-600 mb-3'>
        ハンドルをドラッグして上下に並べ替えてください。上にあるほど自動割当で優先されます。
        {saving && (
          <span className='ml-2 text-primary-600'>保存中...</span>
        )}
      </p>
      <ul className='rounded-lg border border-gray-200 bg-white divide-y divide-gray-100'>
        {items.map((resource, index) => {
          const isDragging = dragIndex === index;
          const isOver = overIndex === index && dragIndex !== null && dragIndex !== index;
          return (
            <li
              key={resource.id}
              draggable={!disabled && !saving}
              onDragStart={() => handleDragStart(index)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={() => handleDrop(index)}
              onDragEnd={handleDragEnd}
              className={`flex items-center gap-3 px-3 py-3 select-none ${
                isDragging ? 'opacity-50 bg-gray-50' : ''
              } ${isOver ? 'bg-amber-50 ring-1 ring-inset ring-amber-300' : ''} ${
                disabled || saving ? 'cursor-not-allowed' : 'cursor-grab active:cursor-grabbing'
              }`}
            >
              <span
                className='text-gray-400 shrink-0'
                aria-hidden
                title='ドラッグして並べ替え'
              >
                <Bars3Icon className='w-5 h-5' />
              </span>
              <span className='w-8 shrink-0 text-sm font-semibold text-amber-700 tabular-nums'>
                {index + 1}
              </span>
              <div className='min-w-0 flex-1'>
                <p className='font-medium text-gray-900 truncate'>
                  {resource.display_name || resource.name}
                </p>
                <p className='text-xs text-gray-500'>
                  優先順値: {resource.sort_order ?? '—'}
                  {!resource.is_active && (
                    <span className='ml-2 text-red-500'>停止中</span>
                  )}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default ResourcePriorityList;
