'use client';

import { getUserEmployments, UserEmploymentDTO } from '@common/services/employee-service';
import { getOrgLeafNodes, OrgLeafNodeDTO } from '@common/services/organization-service';
import type { FieldProps } from '@rjsf/utils';
import LucideIcon from '@sk-web-gui/lucide-icon';
import { Button, Combobox, FormControl, FormLabel } from '@sk-web-gui/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface FacilityInfo {
  orgId?: number;
  orgName?: string;
  parentOrgId?: number;
  manager?: {
    personId?: string;
    givenname?: string;
    lastname?: string;
    emailAddress?: string;
  };
}

export function FacilitySearchField(props: FieldProps) {
  const { idSchema, formData, disabled, readonly, onChange, uiSchema } = props;
  const id = idSchema.$id;

  const uiOptions = (uiSchema?.['ui:options'] || {}) as Record<string, unknown>;
  const className = (uiOptions.className as string) || 'w-full';

  const facilityInfo = formData as FacilityInfo | undefined;

  const employmentsLoadedRef = useRef(false);
  const autoSelectedRef = useRef(false);

  const [searchValue, setSearchValue] = useState('');
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [topOrgId, setTopOrgId] = useState<number | null>(null);
  const [leafNodes, setLeafNodes] = useState<OrgLeafNodeDTO[]>([]);
  const [isLoadingLeafNodes, setIsLoadingLeafNodes] = useState(false);

  const selectFacility = useCallback(
    (employment: UserEmploymentDTO) => {
      onChange({
        orgId: employment.orgId,
        orgName: employment.orgName,
        manager: employment.manager
          ? {
            personId: employment.manager.personId ?? undefined,
            givenname: employment.manager.givenname ?? undefined,
            lastname: employment.manager.lastname ?? undefined,
            emailAddress: employment.manager.emailAddress ?? undefined,
          }
          : undefined,
      });
    },
    [onChange]
  );

  useEffect(() => {
    if (disabled || readonly || employmentsLoadedRef.current) return;

    const loadEmployments = async () => {
      try {
        const employments = await getUserEmployments();
        employmentsLoadedRef.current = true;

        if (employments.length > 0) {
          setTopOrgId(employments[0].topOrgId ?? null);

          if (!autoSelectedRef.current && !formData?.orgId) {
            autoSelectedRef.current = true;
            selectFacility(employments[0]);
          }
        }
      } catch (error) {
        console.error('Failed to load employments:', error);
      }
    };

    loadEmployments();
  }, [disabled, readonly, formData?.orgId, selectFacility]);

  const handleRemove = useCallback(async () => {
    onChange(undefined);
    setSearchValue('');
    setIsConfirmed(false);

    if (topOrgId) {
      setIsLoadingLeafNodes(true);
      try {
        const nodes = await getOrgLeafNodes(topOrgId);
        setLeafNodes(nodes);
      } catch (error) {
        console.error('Failed to load leaf nodes:', error);
      } finally {
        setIsLoadingLeafNodes(false);
      }
    }
  }, [onChange, topOrgId]);

  const handleSelectOrg = useCallback(
    (e: { target: { value: unknown } }) => {
      const selectedOrgId = Number(e.target.value);
      const selectedNode = leafNodes.find((n) => n.orgId === selectedOrgId);

      if (selectedNode) {
        onChange({
          orgId: selectedNode.orgId,
          orgName: selectedNode.orgName,
          parentOrgId: selectedNode.parentId,
        });
        setSearchValue('');
      }
    },
    [leafNodes, onChange]
  );

  const filteredLeafNodes = useMemo(() => {
    if (!searchValue.trim()) return leafNodes;
    const searchLower = searchValue.toLowerCase();
    return leafNodes.filter((n) => n.orgName.toLowerCase().includes(searchLower));
  }, [leafNodes, searchValue]);

  const hasSelection = !!facilityInfo?.orgId;

  const isReadonly = disabled || readonly;

  return (
    <div className={className}>
      <h2 className="text-xl font-bold mb-6">Mer information om platsen</h2>

      {!isReadonly && (
        <FormControl disabled={hasSelection || isLoadingLeafNodes} className="w-full">
          <FormLabel className="font-bold">Lägg till plats där avvikelsen inträffat</FormLabel>
          <Combobox
            id={id}
            className="w-full"
            value={hasSelection ? String(facilityInfo.orgId) : ''}
            onChange={handleSelectOrg}
          >
            <Combobox.Input
              placeholder={isLoadingLeafNodes ? 'Laddar...' : 'Sök organisation...'}
              className="w-full"
              value={hasSelection ? facilityInfo.orgName || '' : undefined}
            />
            <Combobox.List>
              {filteredLeafNodes.map((node) => (
                <Combobox.Option key={node.orgId} value={String(node.orgId)}>
                  {node.orgName}
                </Combobox.Option>
              ))}
            </Combobox.List>
          </Combobox>
        </FormControl>
      )}

      {hasSelection && (
        <div className="border-1 rounded-12 bg-background-content w-full mt-16">
          <div className="rounded-t-12 bg-vattjom-background-200 h-[4rem] flex items-center">
            <strong className="px-[1rem]">Plats där händelsen inträffat</strong>
          </div>
          <div className="p-[1rem]">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-[1.6rem] font-semibold">{facilityInfo.orgName}</p>
              </div>

              <div className="flex gap-8 items-center">
                {disabled || readonly || isConfirmed ?
                  <>
                    <span className="flex items-center gap-4 text-gronsta-surface-primary">
                      <LucideIcon name="check" size={16} />
                      Bekräftat
                    </span>
                    {!disabled && !readonly && (
                      <Button type="button" variant="tertiary" size="sm" onClick={() => setIsConfirmed(false)}>
                        Ändra
                      </Button>
                    )}
                  </>
                  : <>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      leftIcon={<LucideIcon name="check" size={16} />}
                      onClick={() => setIsConfirmed(true)}
                    >
                      Bekräfta
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      leftIcon={<LucideIcon name="x" size={16} />}
                      onClick={handleRemove}
                    >
                      Ta bort
                    </Button>
                  </>
                }
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
