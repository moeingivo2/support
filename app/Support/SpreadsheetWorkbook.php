<?php

namespace App\Support;

/**
 * پایه ساخت فایل Excel با قالب SpreadsheetML 2003 تا همه گزارش‌ها
 * از یک مجموعه ستون و استایل مشترک استفاده کنند.
 */
abstract class SpreadsheetWorkbook
{
    protected function document(string $title, string $subject, string ...$worksheets): string
    {
        return implode('', [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<?mso-application progid="Excel.Sheet"?>',
            '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"',
            ' xmlns:o="urn:schemas-microsoft-com:office:office"',
            ' xmlns:x="urn:schemas-microsoft-com:office:excel"',
            ' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">',
            $this->documentProperties($title, $subject),
            $this->styles(),
            ...$worksheets,
            '</Workbook>',
        ]);
    }

    protected function documentProperties(string $title, string $subject): string
    {
        return '<DocumentProperties xmlns="urn:schemas-microsoft-com:office:office">'
            .'<Author>AIO Support</Author>'
            .'<Title>'.$this->escape($title).'</Title>'
            .'<Subject>'.$this->escape($subject).'</Subject>'
            .'</DocumentProperties>';
    }

    protected function styles(): string
    {
        return '<Styles>'
            .'<Style ss:ID="Default" ss:Name="Normal">'
            .'<Font ss:FontName="Tahoma" ss:Size="10"/>'
            .'<Interior ss:Color="#FFFFFF" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Right" ss:Vertical="Center" ss:WrapText="1"/>'
            .'</Style>'
            .'<Style ss:ID="Title">'
            .'<Font ss:FontName="Tahoma" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/>'
            .'<Interior ss:Color="#061329" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            .'</Style>'
            .'<Style ss:ID="Section">'
            .'<Font ss:FontName="Tahoma" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>'
            .'<Interior ss:Color="#0062FF" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>'
            .'</Style>'
            .'<Style ss:ID="Header">'
            .'<Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#FFFFFF"/>'
            .'<Interior ss:Color="#0062FF" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/>'
            .'</Style>'
            .'<Style ss:ID="Gold">'
            .'<Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1" ss:Color="#061329"/>'
            .'<Interior ss:Color="#F2A93A" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>'
            .'</Style>'
            .'<Style ss:ID="Label">'
            .'<Font ss:FontName="Tahoma" ss:Size="10" ss:Bold="1" ss:Color="#1F2937"/>'
            .'<Interior ss:Color="#EAF2FF" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Right" ss:Vertical="Center"/>'
            .'</Style>'
            .'<Style ss:ID="Total">'
            .'<Font ss:FontName="Tahoma" ss:Size="11" ss:Bold="1" ss:Color="#061329"/>'
            .'<Interior ss:Color="#FFF4D8" ss:Pattern="Solid"/>'
            .'<Alignment ss:Horizontal="Center" ss:Vertical="Center"/>'
            .'</Style>'
            .'</Styles>';
    }

    /**
     * @param  array<int, string>  $rows
     * @param  array<int, float>  $columnWidths
     */
    protected function worksheet(string $name, array $rows, array $columnWidths, bool $fitToWidth = true): string
    {
        $columns = implode('', array_map(
            fn (float $width): string => sprintf('<Column ss:Width="%s"/>', $width),
            $columnWidths,
        ));
        $pageSetup = $fitToWidth
            ? '<PageSetup ss:Orientation="Landscape" ss:FitToWidth="1"/>'
            : '<PageSetup ss:Orientation="Landscape"/>';

        return '<Worksheet ss:Name="'.$this->escape($name).'">'
            .'<Table ss:ExpandedColumnCount="'.count($columnWidths).'" ss:ExpandedRowCount="'.(count($rows) + 1).'">'
            .$columns
            .implode('', $rows)
            .'</Table>'
            .'<WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">'.$pageSetup.'</WorksheetOptions>'
            .'</Worksheet>';
    }

    protected function valueCell(string|int|float $value): string
    {
        return is_numeric($value)
            ? $this->numberCell((float) $value)
            : $this->textCell((string) $value);
    }

    protected function textCell(string $value, string $style = 'Default'): string
    {
        return '<Cell ss:StyleID="'.$style.'"><Data ss:Type="String">'
            .$this->escape($value)
            .'</Data></Cell>';
    }

    protected function numberCell(int|float $value): string
    {
        return '<Cell><Data ss:Type="Number">'.$value.'</Data></Cell>';
    }

    /**
     * @param  array<int, string>  $cells
     */
    protected function row(array $cells, string $style = 'Default', ?float $height = null): string
    {
        $heightAttribute = $height === null ? '' : sprintf(' ss:Height="%s" ss:CustomHeight="1"', $height);
        $styleAttribute = $style === 'Default' ? '' : sprintf(' ss:StyleID="%s"', $style);

        return '<Row'.$styleAttribute.$heightAttribute.'>'.implode('', $cells).'</Row>';
    }

    protected function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_COMPAT, 'UTF-8');
    }
}
