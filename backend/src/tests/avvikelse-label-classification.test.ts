import { resolveAvvikelseClassification } from '@/avvikelse/label-classification';
import type { Label } from '@/data-contracts/supportmanagement/data-contracts';

const classificationLabelStructure: Label[] = [
  {
    id: 'category-root-id',
    classification: 'CATEGORY_ROOT',
    resourceName: 'CATEGORY',
    resourcePath: 'CATEGORY',
    labels: [
      {
        id: 'category-owner-id',
        classification: 'PROVISION_CATEGORY',
        resourceName: 'HSL',
        resourcePath: 'CATEGORY/HSL',
        labels: [
          {
            id: 'category-label-id',
            classification: 'CATEGORY',
            resourceName: 'REHAB',
            resourcePath: 'CATEGORY/HSL/REHAB',
            labels: [
              {
                id: 'type-label-id',
                classification: 'TYPE',
                resourceName: 'MISSED',
                resourcePath: 'CATEGORY/HSL/REHAB/MISSED',
              },
              {
                id: 'other-type-label-id',
                classification: 'TYPE',
                resourceName: 'OTHER',
                resourcePath: 'CATEGORY/HSL/REHAB/OTHER',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'report-type-id',
    classification: 'REPORT_TYPE_ROOT',
    resourceName: 'REPORT_TYPE',
    resourcePath: 'REPORT_TYPE',
    labels: [
      {
        id: 'deviation-id',
        classification: 'REPORT_TYPE',
        resourceName: 'DEVIATION',
        resourcePath: 'REPORT_TYPE/DEVIATION',
      },
    ],
  },
];

const classificationLabelTree = {
  root: { resource: 'CATEGORY', classification: 'CATEGORY_ROOT' },
  ownerClassification: 'PROVISION_CATEGORY',
  categoryClassification: 'CATEGORY',
  typeClassification: 'TYPE',
};

describe('resolveAvvikelseClassification', () => {
  it('resolves only the exact owner/category/type ids from the metadata CATEGORY tree', () => {
    expect(
      resolveAvvikelseClassification(
        {
          classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
          categoryLabels: [{ id: 'type-label-id' }, { id: 'category-owner-id' }, { id: 'category-label-id' }],
        },
        classificationLabelStructure,
        classificationLabelTree,
      ),
    ).toEqual({
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
      managedCategoryLabelIds: ['category-root-id', 'category-owner-id', 'category-label-id', 'type-label-id', 'other-type-label-id'],
      managedRootResource: 'CATEGORY',
    });
  });

  it('returns canonical metadata paths instead of persisting normalized client strings', () => {
    expect(
      resolveAvvikelseClassification(
        {
          classification: { category: '  category/hsl ', type: '/category/hsl/rehab/' },
          categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
        },
        classificationLabelStructure,
        classificationLabelTree,
      ).classification,
    ).toEqual({ category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' });
  });

  it('uses resource names when classification metadata omits optional resource paths', () => {
    const structureWithoutPaths = structuredClone(classificationLabelStructure);
    const removePaths = (labels: Label[]) => {
      labels.forEach(label => {
        delete label.resourcePath;
        if (label.labels) removePaths(label.labels);
      });
    };
    removePaths(structureWithoutPaths);

    const resolved = resolveAvvikelseClassification(
      {
        classification: { category: 'HSL', type: 'REHAB' },
        categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
      },
      structureWithoutPaths,
      classificationLabelTree,
    );

    expect(resolved.classification).toEqual({ category: 'HSL', type: 'REHAB' });
    expect(resolved.categoryLabels).toEqual([{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }]);
  });

  it('ignores CATEGORY-classified labels outside the CATEGORY metadata root', () => {
    const structureWithForeignCategory = [
      ...classificationLabelStructure,
      {
        id: 'foreign-category-id',
        classification: 'CATEGORY',
        resourceName: 'FOREIGN',
        resourcePath: 'CATEGORY/FOREIGN',
      },
    ];

    expect(() =>
      resolveAvvikelseClassification(
        {
          classification: { category: 'CATEGORY/FOREIGN', type: 'CATEGORY/FOREIGN' },
          categoryLabels: [{ id: 'foreign-category-id' }],
        },
        structureWithForeignCategory,
        classificationLabelTree,
      ),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('rejects non-category ids and classification paths that do not match metadata', () => {
    expect(() =>
      resolveAvvikelseClassification(
        {
          classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
          categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'deviation-id' }],
        },
        classificationLabelStructure,
        classificationLabelTree,
      ),
    ).toThrow(expect.objectContaining({ status: 400 }));

    expect(() =>
      resolveAvvikelseClassification(
        {
          classification: { category: 'CATEGORY/SOL_LSS', type: 'CATEGORY/HSL/REHAB' },
          categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
        },
        classificationLabelStructure,
        classificationLabelTree,
      ),
    ).toThrow(expect.objectContaining({ status: 400 }));
  });

  it('rejects a known category without exactly one valid undercategory', () => {
    for (const categoryLabels of [
      [{ id: 'category-owner-id' }, { id: 'category-label-id' }],
      [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }, { id: 'other-type-label-id' }],
    ]) {
      expect(() =>
        resolveAvvikelseClassification(
          {
            classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
            categoryLabels,
          },
          classificationLabelStructure,
          classificationLabelTree,
        ),
      ).toThrow(expect.objectContaining({ status: 400 }));
    }
  });

  it('projects a future application custom root and classification vocabulary', () => {
    const futureTree = {
      root: { resource: 'INCIDENTS', classification: 'INCIDENT_ROOT' },
      ownerClassification: 'ACT_BRANCH',
      categoryClassification: 'INCIDENT_CLASS',
      typeClassification: 'INCIDENT_DETAIL',
    };
    const futureStructure: Label[] = [
      {
        id: 'future-root',
        classification: 'INCIDENT_ROOT',
        resourceName: 'INCIDENTS',
        resourcePath: 'INCIDENTS',
        labels: [
          {
            id: 'future-owner',
            classification: 'ACT_BRANCH',
            resourceName: 'FUTURE_ACT',
            resourcePath: 'INCIDENTS/FUTURE_ACT',
            labels: [
              {
                id: 'future-category',
                classification: 'INCIDENT_CLASS',
                resourceName: 'SAFETY',
                resourcePath: 'INCIDENTS/FUTURE_ACT/SAFETY',
                labels: [
                  {
                    id: 'future-type',
                    classification: 'INCIDENT_DETAIL',
                    resourceName: 'FALL',
                    resourcePath: 'INCIDENTS/FUTURE_ACT/SAFETY/FALL',
                  },
                ],
              },
            ],
          },
        ],
      },
    ];

    expect(
      resolveAvvikelseClassification(
        {
          classification: { category: 'INCIDENTS/FUTURE_ACT', type: 'INCIDENTS/FUTURE_ACT/SAFETY' },
          categoryLabels: [{ id: 'future-owner' }, { id: 'future-category' }, { id: 'future-type' }],
        },
        futureStructure,
        futureTree,
      ),
    ).toEqual({
      classification: { category: 'INCIDENTS/FUTURE_ACT', type: 'INCIDENTS/FUTURE_ACT/SAFETY' },
      categoryLabels: [{ id: 'future-owner' }, { id: 'future-category' }, { id: 'future-type' }],
      managedCategoryLabelIds: ['future-root', 'future-owner', 'future-category', 'future-type'],
      managedRootResource: 'INCIDENTS',
    });
  });

  it('fails closed when the configured classification root is missing or duplicated', () => {
    const request = {
      classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
      categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
    };

    expect(() => resolveAvvikelseClassification(request, [], classificationLabelTree)).toThrow(
      expect.objectContaining({
        status: 502,
        message: 'Support Management classification metadata expected one configured root CATEGORY/CATEGORY_ROOT, found 0',
      }),
    );
    expect(() =>
      resolveAvvikelseClassification(
        request,
        [
          ...classificationLabelStructure,
          { id: 'duplicate-root', classification: 'CATEGORY_ROOT', resourceName: 'CATEGORY', resourcePath: 'CATEGORY' },
        ],
        classificationLabelTree,
      ),
    ).toThrow(
      expect.objectContaining({
        status: 502,
        message: 'Support Management classification metadata expected one configured root CATEGORY/CATEGORY_ROOT, found 2',
      }),
    );
    for (const nearMiss of [
      [{ id: 'wrong-resource', classification: 'CATEGORY_ROOT', resourceName: 'CATEGORY', resourcePath: 'OTHER' }],
      [{ id: 'wrong-classification', classification: 'OTHER_ROOT', resourceName: 'CATEGORY', resourcePath: 'CATEGORY' }],
    ] as Label[][]) {
      expect(() => resolveAvvikelseClassification(request, nearMiss, classificationLabelTree)).toThrow(
        expect.objectContaining({
          status: 502,
          message: 'Support Management classification metadata expected one configured root CATEGORY/CATEGORY_ROOT, found 0',
        }),
      );
    }
  });

  it('treats duplicate ids in classification metadata as an upstream contract error', () => {
    const duplicateIdStructure = structuredClone(classificationLabelStructure);
    const firstType = duplicateIdStructure[0]?.labels?.[0]?.labels?.[0]?.labels?.[0];
    expect(firstType).toBeDefined();
    firstType!.id = 'category-label-id';

    expect(() =>
      resolveAvvikelseClassification(
        {
          classification: { category: 'CATEGORY/HSL', type: 'CATEGORY/HSL/REHAB' },
          categoryLabels: [{ id: 'category-owner-id' }, { id: 'category-label-id' }, { id: 'type-label-id' }],
        },
        duplicateIdStructure,
        classificationLabelTree,
      ),
    ).toThrow(
      expect.objectContaining({
        status: 502,
        message: 'Support Management classification metadata contains duplicate label ids',
      }),
    );
  });
});
