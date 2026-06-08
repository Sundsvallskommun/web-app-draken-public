import { ExtraParameter } from '@common/data-contracts/case-data/data-contracts';

export const preventProcessExtraParameters = (extraParameters: ExtraParameter[]) => {
  const processParamKeys = ['process.phaseStatus', 'process.displayPhase', 'process.phaseAction'];
  processParamKeys.forEach((key) => {
    const param = extraParameters.find((p: any) => p.key === key);
    expect(param).to.be.undefined;
  });
};
