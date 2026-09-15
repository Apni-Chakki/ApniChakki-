import React from "react";
import { Card } from "../../../common/card";
import { Button } from "../../../common/button";
import { Badge } from "../../../common/badge";
import { Pagination } from "../../../common/Pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../../common/table";
import { Phone, ChevronRight, Loader2 } from "lucide-react";

export const CustomerLedgerTable = ({
  ledgers = [],
  loadingCustomer = false,
  customerSearch = "",
  setSelectedCustomer,
  totalItems = 0,
  page = 1,
  setPage,
  pageSize = 10,
  setPageSize,
  t = (s) => s,
}) => {
  if (loadingCustomer && ledgers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">{t("Loading Customer Udhaar Ledger...")}</p>
      </div>
    );
  }

  return (
    <>
      {/* Mobile View: Cards */}
      <div className="md:hidden space-y-3">
        {ledgers.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            {customerSearch
              ? t("No customers found matching your search.")
              : t("No outstanding customer debts! Good job.")}
          </Card>
        ) : (
          ledgers.map((customer) => (
            <Card key={customer.phone} className="p-3.5 space-y-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm break-words">{customer.name}</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1 break-all">
                    <Phone className="h-3 w-3 shrink-0" />
                    {customer.phone}
                  </p>
                </div>
                <Badge variant="destructive" className="shrink-0 text-xs">
                  Rs. {customer.totalDebt.toLocaleString()}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("Pending Orders")}</p>
                  <p className="text-sm font-semibold">{customer.orderCount}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase">{t("Last Order")}</p>
                  <p className="text-xs font-medium">
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : "N/A"}
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setSelectedCustomer && setSelectedCustomer(customer)}
              >
                {t("View & Settle")} <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </Card>
          ))
        )}
      </div>

      {/* Desktop View: Table */}
      <Card className="hidden md:block overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>{t("Customer")}</TableHead>
              <TableHead>{t("Phone")}</TableHead>
              <TableHead>{t("Pending Orders")}</TableHead>
              <TableHead>{t("Last Order")}</TableHead>
              <TableHead>{t("Total Debt")}</TableHead>
              <TableHead className="text-right">{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ledgers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  {customerSearch
                    ? t("No customers found matching your search.")
                    : t("No outstanding customer debts! Good job.")}
                </TableCell>
              </TableRow>
            ) : (
              ledgers.map((customer) => (
                <TableRow key={customer.phone}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                        {customer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-semibold">{customer.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Phone className="h-3.5 w-3.5" />
                      {customer.phone}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {customer.orderCount} {t("Orders")}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {customer.lastOrderDate
                      ? new Date(customer.lastOrderDate).toLocaleDateString()
                      : "N/A"}
                  </TableCell>
                  <TableCell>
                    <span className="text-red-600 font-bold text-base">
                      Rs. {customer.totalDebt.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedCustomer && setSelectedCustomer(customer)}
                    >
                      {t("View & Settle")} <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        {totalItems > 0 && (
          <Pagination
            currentPage={page}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              if (setPageSize) setPageSize(s);
              if (setPage) setPage(1);
            }}
            className="p-4"
          />
        )}
      </Card>
    </>
  );
};

export default CustomerLedgerTable;
