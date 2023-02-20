import { Canvas, NodeCanvasRenderingContext2D } from 'canvas';
import { renderTr } from './cell';
import { Column, flatColumns, genColumns, renderTh } from './column';
import { IColumn, TableStyle, TableOpt, TextStyle } from './type';

const defaultStyle: Required<TableStyle> = {
    headerRowHeight: 55,
    rowHeight: 55,
    columnWidth: 150,
    borderColor: '#e8e8e8',
    textAlign: 'left',
    color: 'rgba(0,0,0,0.85)',
    fontSize: '14px',
    fontFamily: 'sans-serif',
    headerBgColor: 'rgba(0,0,0,0.02)',
    paddingLR: 8,
    background: null,
}

class Table2canvas<T extends Record<string, any> = any>{
    public canvas: Canvas;
    public bgColor: string;
    public text?: string;
    public textStyle: TextStyle = { textAlign: 'center', lineHeight: 55 };
    public sourceColumns: IColumn<T>[];
    public columns: Column[];
    public flatColumns: Column[];
    public tableWidth = 0;
    public tableHeight = 55;
    public headHeight = 55;
    public dataSource: T[];
    public left = 10;
    public top = 10;
    public right = 10;
    public bottom = 10;
    public style: Required<TableStyle>;
    public padding: [number, number, number, number];
    public width: number | 'auto';
    public height: number | 'auto';
    public ctx: NodeCanvasRenderingContext2D;
    public devicePixelRatio: number = 1;

    public constructor({ canvas, padding, columns = [], dataSource = [], style, bgColor, text, textStyle, width, height, devicePixelRatio }: TableOpt<T>) {
        this.canvas = canvas;
        this.sourceColumns = columns;
        this.dataSource = dataSource || [];
        const _style = { ...defaultStyle, ...style, headerRowHeight: style?.headerRowHeight || style?.rowHeight || defaultStyle.headerRowHeight };
        this.style = _style;
        this.bgColor = bgColor ?? 'transparent';
        this.text = text;
        this.width = width || 'auto';
        this.height = height || 'auto';
        this.padding = handlePadding(padding);
        this.textStyle = {
            ...this.textStyle,
            color: _style.color,
            fontSize: _style.fontSize,
            fontFamily: _style.fontFamily,
            ...textStyle
        };
        if (text) {
            this.padding[0] += (this.textStyle.lineHeight || 55);
        }
        this.left = this.padding[3];
        this.right = this.padding[1];
        this.top = this.padding[0];
        this.bottom = this.padding[2];
        this.ctx = canvas.getContext('2d');

        if (devicePixelRatio) {
            this.devicePixelRatio = devicePixelRatio;
        }

        this.columns = genColumns(columns, {
            width: _style.columnWidth,
            height: _style.headerRowHeight,
            borderColor: _style.borderColor,
            paddingLR: _style.paddingLR,
            fontSize: _style.fontSize,
            fontFamily: _style.fontFamily,
            bgColor: _style.headerBgColor,
            textAlign: _style.textAlign,
        })

        this.flatColumns = flatColumns(this.columns);
        this.render();
    }

    private render() {
        this.resize();
        this.renderTh();
        this.renderTr();
        this.renderTitle();
    }

    private renderTh() {
        const { ctx, top, left } = this;
        let x = left;
        for (const item of this.columns) {
            ctx.save();
            ctx.translate(x, top);
            renderTh(ctx, item);
            ctx.restore();
            x += item.width;
        }
    }

    private renderTr() {
        const { dataSource, flatColumns, ctx, style, top, left, tableWidth, headHeight } = this;
        const { rowHeight } = style;
        if (!dataSource.length && tableWidth) {
            ctx.save();
            ctx.strokeStyle = this.style.borderColor;
            ctx.strokeRect(left, top + headHeight, this.tableWidth, rowHeight * 2);
            ctx.fillStyle = "#999";
            ctx.textAlign = 'center';
            ctx.fillText('Empty Data!', left + 0.5 * tableWidth, top + headHeight + rowHeight, tableWidth);
            ctx.restore();
            return;
        };
        ctx.save();
        ctx.translate(left, top + headHeight);
        for (let i = 0, l = dataSource.length; i < l; i++) {
            ctx.save();
            ctx.translate(0, i * rowHeight)
            renderTr(ctx, dataSource[i], i, flatColumns, rowHeight);
            ctx.restore();
        }
        ctx.restore();
    }

    private renderTitle() {
        if (!this.text) return;
        const { ctx, left, top, right, tableWidth, textStyle, text } = this;
        const { fontSize, fontFamily, lineHeight = 55, color, textAlign } = textStyle;
        ctx.save();
        ctx.font = `bold ${fontSize} ${fontFamily}`;
        ctx.fillStyle = color || '#333';
        ctx.textAlign = textAlign || 'center';
        const midY = top - lineHeight * 0.5;
        const width = this.canvas.width;
        if (ctx.textAlign === 'center') {
            ctx.fillText(text, 0.5 * width / this.devicePixelRatio, midY, tableWidth);
        } else if (ctx.textAlign === 'right') {
            ctx.fillText(text, width - right / this.devicePixelRatio, midY, tableWidth);
        } else {
            ctx.fillText(text, left / this.devicePixelRatio, midY, tableWidth);
        }
        ctx.restore();
    }

    private initCtxStatus() {
        const { ctx } = this;
        const { color, fontSize, fontFamily, textAlign } = this.style;
        ctx.font = `${fontSize} ${fontFamily}`;
        ctx.fillStyle = color;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
    }

    public resize() {
        const { ctx, canvas } = this;
        const length = this.dataSource?.length || 2;
        const maxThRowNum = Math.max(...this.flatColumns.map(v => v.deep));
        let width = 0;
        for (const item of this.columns) {
            width += item.width;
        }
        this.tableWidth = width;
        this.headHeight = maxThRowNum * this.style.headerRowHeight;
        let height = length * this.style.rowHeight + this.headHeight;
        this.tableHeight = height;

        const [top, right, bottom, left] = this.padding;
        width = width + left + right;
        height = height + top + bottom;

        let scale = 1
        if (this.width === 'auto' && this.height !== 'auto') {
            scale = height / this.height;

        } else if (this.width !== 'auto' && this.height === 'auto') {
            scale = width / this.width;

        } else if (this.width !== 'auto' && this.height !== 'auto') {
            scale = Math.max(width / this.width, height / this.height);
        }
        scale = scale || 1;
        scale = 1 / scale;

        canvas.width = width * scale * this.devicePixelRatio;
        canvas.height = height * scale * this.devicePixelRatio;
        this.initCtxStatus();


        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = this.bgColor;
        //canvas background color
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        //table background color
        if (this.style.background) {
            ctx.fillStyle = this.style.background;
            ctx.fillRect(top * scale, left * scale, this.tableWidth * scale, this.tableHeight * scale);
        }
        ctx.restore();

        ctx.scale(scale * this.devicePixelRatio, scale * this.devicePixelRatio);
    }

    appendData(dataSource: T[]) {
        if (dataSource.length) {
            this.dataSource = this.dataSource.concat(dataSource);
            this.render();
        }
    }
}

export default Table2canvas;

function handlePadding(padding?: number[] | number): [number, number, number, number] {
    if (typeof padding === 'number') {
        return [padding, padding, padding, padding];
    } else if (padding instanceof Array && padding.length) {
        return [...padding, ...padding, ...padding, ...padding].slice(0, 4) as any;
    }
    return [10, 10, 10, 10]
}

export * from './type';