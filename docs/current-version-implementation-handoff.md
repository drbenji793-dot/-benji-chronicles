# Current version implementation checkpoint

Status: implemented in a development branch, not deployed or verified. Benji requested implementation first with testing and author approval later.

## Added coverage

The separate Approve action now captures the planning source before opening its confirmation, checks it again on submission, and passes it to a server transaction. Separate transfer passes its reviewed token to its own transaction endpoint. Both endpoints lock the chapter and the registered planning branch and delegate to the existing approval or transfer implementation. Combined approval and transfer retain the deployed endpoint.

The SQL file is the complete additive installation source. Do not deploy the client until the new endpoints have been applied and tested. No production migration or content mutation was performed for this checkpoint.

## Pending acceptance

Run the full release suite, extend actual UI tests for separate approval and transfer, run anonymous-role transaction and rollback tests for both new endpoints, check direct legacy RPC coverage, then publish both editions. Keep the production release number unchanged until that release.

## Guide authority

Current general Arabic guide: zk7.0, complete Language Lab: https://chatgpt.com/library?file_id=libfile_12e5dc5bf3d08191984cf4dd5437632d&account_id=personal

HQ protocol selection remains dynamic and language scoped. Preserve book and passage choices and do not relabel old zk6 experiments. Manuscript changes, biography and relationship decisions remain separate author review items.
