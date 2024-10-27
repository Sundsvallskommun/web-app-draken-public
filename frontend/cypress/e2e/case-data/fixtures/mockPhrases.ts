import { base64Encode } from '@common/services/helper-service';

export const mockPhrases = {
  data: {
    identifier: 'sbk.rph.decision.phrases.all.cancellation',
    version: '1.1',
    name: 'Parkeringstillstånd - Beslut - Fraser - Alla - Avskriven',
    description: 'Beslut för parkeringstillstånd PRH',
    metadata: [
      { key: 'applicantCapacity', value: 'DRIVER' },
      { key: 'caseType', value: 'PARKING_PERMIT' },
      { key: 'caseOrigin', value: 'OpenE' },
      { key: 'caseOrigin', value: 'HGUI' },
      { key: 'process', value: 'PRH' },
      { key: 'caseType', value: 'PARKING_PERMIT_RENEWAL' },
      { key: 'templateType', value: 'Decision' },
      { key: 'applicantCapacity', value: 'PASSENGER' },
      { key: 'legalReference', value: '13 kap. 8 §' },
      { key: 'businessUnit', value: 'SBK' },
      { key: 'decision', value: 'CANCELLATION' },
      { key: 'decision', value: 'DISMISSED' },
    ],
    defaultValues: [],
    lastModifiedAt: '2022-12-07T14:26:47',
    content: base64Encode('Mock phrase'),
    // content:
    //   'PHA+RGVuIGFuc8O2a2FuIHNvbSBpbmtvbSB2YXIgaW50ZSBrb21wbGV0dCBvY2ggaSBldHQgbWVkZGVsYW5kZSBzb20gc2tpY2thZGVzIHRpbGwgZGlnIFlZWVktTU0tREQgaW5mb3JtZXJhZGVzIGR1IGF0dCBrb21wbGV0dGVyaW5nYXIgdGlsbCBkaW4gYW5zw7ZrYW4gc2t1bGxlIGtvbW1hIGluIHRpbGwgVHJhZmlrc2VrdGlvbmVuIHNlbmFzdCBZWVlZLU1NLURELjwvcD4KPHA+QW5zw7ZrYW4va29tcGxldHRlcmluZ2FyIGhhciBpbnRlIGlubMOkbW5hdHMgaW5vbSBhbmdpdmVuIHRpZCBvY2ggZMOkcmbDtnIgYXZicnl0cyBoYW5kbMOkZ2duaW5nZW4gb2NoIMOkcmVuZGV0IGF2c2x1dGFzLjwvcD4KPHA+RMOlIGR1IGVmdGVyIGRldHRhIGhhciDDpXRlcmthbGxhdCBkaW4gYW5zw7ZrYW4gYXZicnl0cyBoYW5kbMOkZ2duaW5nZW4gb2NoIMOkcmVuZGV0IGF2c2x1dGFzLjwvcD4=',
  },
  message: 'success',
};
