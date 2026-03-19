import React from 'react';
import { GamePropertiesPanel, GamePropertiesPanelHandle } from '../GamePropertiesPanel';
import type { StagedGame } from '../../types/importer';

export interface ImportWorkbenchEditorProps {
    selectedGame: StagedGame | null;
    queue: StagedGame[];
    isScanning: boolean;
    panelRef: React.RefObject<GamePropertiesPanelHandle>;
    onUpdateGame: (updated: StagedGame) => void;
}

export const ImportWorkbenchEditor: React.FC<ImportWorkbenchEditorProps> = ({
    selectedGame,
    queue,
    isScanning,
    panelRef,
    onUpdateGame,
}) => {
    if (!selectedGame) {
        return null;
    }

    return (
        <GamePropertiesPanel
            ref={panelRef}
            game={selectedGame}
            isStaged={true}
            onSave={async (updatedGame) => onUpdateGame(updatedGame as StagedGame)}
            allCategories={Array.from(new Set(queue.flatMap(g => g.categories || [])))}
            editingDisabled={isScanning}
            editingDisabledReason="Editing is disabled while the scan is in progress. Please wait for the scan to complete to avoid the app hanging."
        />
    );
};

