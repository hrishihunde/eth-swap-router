import { buildGraph, classicDijkstra, printRoutingResult } from './swap/classic';
import { buildGraphPSB, psbDijkstra, runPSBRouter } from './swap/psb-dijkstra';

async function compareRouters() {
	console.log('\n=== SWAPLY ROUTER COMPARISON ===\n');

	// Build both graphs (PSB may filter edges)
	const classicGraph = await buildGraph();
	const psbGraph = await buildGraphPSB();

	// Scenarios to compare
	const scenarios = [
		{ from: 'eth-usdc', to: 'eth-weth', desc: 'Ethereum USDC → WETH (same chain)' },
		{ from: 'eth-usdc', to: 'poly-wmatic', desc: 'Ethereum USDC → Polygon WMATIC (cross-chain)' },
		{ from: 'poly-usdc', to: 'arb-weth', desc: 'Polygon USDC → Arbitrum WETH (cross-chain)' },
	];

	for (const scenario of scenarios) {
		console.log('\n----------------------------------------');
		console.log(`Scenario: ${scenario.desc}`);

		const classicResult = classicDijkstra(classicGraph, scenario.from, scenario.to);
		printRoutingResult(classicResult, `CLASSIC RESULT: ${scenario.from} → ${scenario.to}`);

		const psbResult = psbDijkstra(psbGraph, scenario.from, scenario.to);
		printRoutingResult(psbResult, `PSB RESULT: ${scenario.from} → ${scenario.to}`);

		// Simple comparison
		const classicRate = classicResult?.totalRate ?? 0;
		const psbRate = psbResult?.totalRate ?? 0;

		console.log('\n>> Comparison');
		console.log(`   • Classic totalRate: ${classicRate.toFixed(6)}`);
		console.log(`   • PSB totalRate:     ${psbRate.toFixed(6)}`);

		if (classicRate > psbRate) {
			console.log('   → Classic delivered a higher output rate for this scenario');
		} else if (psbRate > classicRate) {
			console.log('   → PSB delivered a higher output rate for this scenario');
		} else {
			console.log('   → Both delivered equal output rate (or no route found)');
		}
	}

	console.log('\n=== End comparison ===\n');
}

// Run the comparison when this module is executed
compareRouters().catch(err => {
	console.error('Runner failed:', err);
});

export { compareRouters };
