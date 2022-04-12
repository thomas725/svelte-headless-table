import type { Column, ColumnGroup, ColumnLeaf } from '$lib/types/Column';
import type { ThBlank, Th } from '$lib/types/Th';
import { sum } from './math';
import { NBSP } from '../constants';

/**
 * Transform the column representation of the table headers into rows in the table head.
 * @param columns The column structure grouped by columns.
 * @returns A list of header groups representing rows in the table head.
 */
export const getHeaderRows = <Item extends object>(columns: Column<Item>[]): Th<Item>[][] => {
	/**
	 * Map each column to a list of header rows.
	 * The number of rows depends on the depth of nested columns in each column.
	 *
	 * columns: {...}        {...}        {...}
	 * groups:  [[..] [..]]  [[..]]       [[..] [..] [..]]
	 */
	const columnGroups: Th<Item>[][][] = columns.map((column) => {
		if ((column as ColumnLeaf<Item>).key !== undefined) {
			const leaf = column as ColumnLeaf<Item>;
			return [
				[
					{
						type: 'leaf',
						colspan: 1,
						key: leaf.key,
						name: leaf.name,
					},
				],
			];
		} else {
			const group = column as ColumnGroup<Item>;
			/**
			 * Get the rows representing this column.
			 *
			 * column: {...}
			 * rows:   [[..] [..]]
			 */
			const rows = getHeaderRows(group.columns);
			/**
			 * The colspan of this group is the sum of colspans of the row directly below.
			 */
			const colspan = sum(...rows[0].map((firstRowCell) => firstRowCell.colspan));
			/**
			 * Add this group on top of child column rows.
			 */
			return [
				[
					{
						type: 'group',
						colspan,
						name: group.name,
					},
				],
				...rows,
			];
		}
	});

	const height = Math.max(...columnGroups.map((rows) => rows.length));
	const colspan = sum(
		...columnGroups.map((rows) => sum(...rows[0].map((firstRowCell) => firstRowCell.colspan)))
	);
	/**
	 * Create a grid of blank header cells.
	 */
	const resultRows: Maybe<Th<Item>>[][] = [];
	for (let i = 0; i < height; i++) {
		resultRows.push(Array(colspan).fill({ colspan: 1, type: 'blank', name: NBSP } as ThBlank));
	}

	/**
	 * Populate the header cells.
	 */
	let groupColumnOffset = 0;
	columnGroups.forEach((rows) => {
		const numBlankRows = height - rows.length;
		rows.forEach((row, rowIdx) => {
			let columnOffset = 0;
			row.forEach((cell) => {
				resultRows[numBlankRows + rowIdx][groupColumnOffset + columnOffset] = cell;
				/**
				 * Set cells to be merged as undefined.
				 */
				for (let blankOffset = 1; blankOffset < cell.colspan; blankOffset++) {
					resultRows[numBlankRows + rowIdx][groupColumnOffset + columnOffset + blankOffset] =
						undefined;
				}
				columnOffset += cell.colspan;
			});
		});
		groupColumnOffset += sum(...rows[0].map((firstRowCell) => firstRowCell.colspan));
	});

	/**
	 * Remove undefined elements.
	 */
	return resultRows.map((row) => row.filter((cell) => cell !== undefined)) as Th<Item>[][];
};