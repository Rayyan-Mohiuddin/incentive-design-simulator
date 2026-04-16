import { useState } from "react";

function ComparisonEngine({selected}) {
    if (selected.length === 2) {
        const attemptA = selected[0];
        const attemptB = selected[1];

        const payoutDiff = Math.abs(attemptA.amount - attemptB.amount);
        const scoreDiff = Math.abs(attemptA.score - attemptB.score);

        const metricA = Object.keys(attemptA.metric_breakdown);

        return (
            <div>
                <h4>Comparison</h4>

                <p>Attempt {attemptA.attempt_number} v Attempt {attemptB.attempt_number}</p>
                <p>Payout Diifference: {payoutDiff}</p>
                <p>Score Difference: {scoreDiff}</p>

                <h4>Metric Comparison</h4>

                <table>
                    <thead>
                        <tr>   
                            <td>Metric</td>
                            <td>A</td>
                            <td>B</td>
                            <td>∆</td>
                        </tr>
                    </thead>
                    <tbody>
                        {metricA.map((key) => {
                            return (
                                <tr key={key}>
                                    <td>{key}</td>
                                    <td>{attemptA.metric_breakdown[key].contribution_to_score}</td>
                                    <td>{attemptB.metric_breakdown[key].contribution_to_score}</td>
                                    <td>{attemptA.metric_breakdown[key].contribution_to_score - attemptB.metric_breakdown[key].contribution_to_score}</td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        )
    }
}

export default ComparisonEngine;