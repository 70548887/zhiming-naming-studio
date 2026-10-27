import {createNamingCoverageDto} from '../src/domain/naming-coverage';
import type {CoverageDto, CoverageLoaderSets} from '../src/shared/naming-coverage';

export function consumerTypeEvidence(input: CoverageLoaderSets): CoverageDto {
  const dto = createNamingCoverageDto(input);
  if (dto.status === 'available') {
    const n: number = dto.meanings.defaultAutomatic.count;
    void n;
    // @ts-expect-error Product consumers cannot rewrite a count.
    dto.meanings.defaultAutomatic.count = 1;
    // @ts-expect-error Nested character sets are readonly.
    dto.characters.characters.push('字');
    // @ts-expect-error Candidate state stays off.
    dto.meanings.b04ReadOnlyOff.activation = 'on';
    // @ts-expect-error Imagery does not establish traditional elements.
    dto.elements.imageryEstablishesTraditionalElements = true;
  } else {
    const status: 'unavailable' = dto.status;
    void status;
    // @ts-expect-error No numeric facts exist on the unavailable branch.
    dto.characters.count;
  }
  // @ts-expect-error Input source collections are readonly.
  input.baseMeanings = {status: 'unavailable', reason: 'missing-source'};
  return dto;
}
