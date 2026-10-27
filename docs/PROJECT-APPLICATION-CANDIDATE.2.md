# Application candidate.2: owned JSON replay inputs

M786 is an independent revision of the unreleased application candidate. Its publication is `project-naming-application/1.3.2-candidate.2` and its policy is `naming-element-application/1.3.2-candidate.2`. The engine dependency remains the exact fixed r2 preview closure. Product Store, Service, UI and existing version dispatch are unchanged.

M784 reproduced two incorrect `verified-saved` acceptances in candidate.1: a nested Proxy exposed conflicting ordinary reads and descriptors, and a tuple Proxy modified previously serialized fields during verification. The trusted naming input still came from independent recomputation as 土/金; those probes did not forge a generation capability.

The new application-local `owned-descriptor-json/1` boundary rejects Proxy objects at every depth, including revoked proxies, before any reflective operation. It copies own enumerable data descriptors into a detached, deeply frozen tree, without getters, `toJSON`, caller iterators or ordinary property reads. Verification, fixed-version replay and final equality operate on that owned snapshot. Configuration and profile inputs use the same local boundary. The shared core JSON implementation is unchanged.

Legal plain JSON capture → serialization → `verifySaved` remains available. Existing unique/certificate requirements and multiple/no-consistent/unknown-hour barriers remain in force. Candidate.1 saved tuples are not relabeled or accepted as candidate.2. Candidate.1 is superseded for future candidate admission; its publication, fixtures, receipts and original failed probes remain historical evidence, not newly certified results.

The fixed application closure includes the new helper, adapter, saved verifier, builder and policy data. Every declared resource, including nested vendor payloads, must be tracked in Git. The focused tests reconstruct source and publication bytes from Git objects and run the built artifact without checkout sources.

This revision addresses the new input boundary only. It does not claim complete traditional useful-god rules, production admission, Store/Service integration or revalidation of every old receipt.
