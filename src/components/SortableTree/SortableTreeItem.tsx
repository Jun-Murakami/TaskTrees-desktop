import { CSSProperties } from 'react';
import type { UniqueIdentifier } from '@dnd-kit/core';
import { AnimateLayoutChanges, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { TreeItem, TreeItemProps } from './TreeItem';
import { iOS } from './utilities';

interface Props extends TreeItemProps {
  id: UniqueIdentifier;
  isNewTask?: boolean;
  addedTaskId?: UniqueIdentifier | null;
  removeTrashDescendants?: () => Promise<void>;
  removeTrashDescendantsWithDone?: () => Promise<void>;
}

const animateLayoutChanges: AnimateLayoutChanges = ({ isSorting, wasDragging }) => (isSorting || wasDragging ? false : true);

export function SortableTreeItem({ id, depth, ...props }: Props) {
  const { attributes, isDragging, isSorting, listeners, setDraggableNodeRef, setDroppableNodeRef, transform, transition } =
    useSortable({
      id,
      animateLayoutChanges,
      disabled: id === 'trash',
    });
  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <TreeItem
      id={id}
      ref={setDraggableNodeRef}
      wrapperRef={setDroppableNodeRef}
      style={style}
      depth={depth}
      ghost={isDragging}
      disableSelection={iOS}
      disableInteraction={isSorting}
      handleProps={{
        ...attributes,
        ...listeners,
      }}
      isNewTask={props.isNewTask}
      addedTaskId={props.addedTaskId}
      {...props}
    />
  );
}
